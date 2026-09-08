// Core scan engine. Passive and non-destructive only: every request is a
// plain GET/OPTIONS a browser would make anyway. No payload injection, no
// brute forcing, no exploitation — this reports weaknesses, it doesn't use
// them.
'use strict';

const http = require('node:http');
const https = require('node:https');
const { URL } = require('node:url');
const { resolveAndValidateHost } = require('./ssrf-guard');
const { KB, SEVERITY_ORDER, SEVERITY_WEIGHT } = require('./knowledge-base');

const MAX_BODY_BYTES = 2 * 1024 * 1024;
const REQUEST_TIMEOUT_MS = 10_000;
const MAX_REDIRECTS = 5;

function makeFinding(id, { evidence, severity, extra } = {}) {
  const kb = KB[id];
  if (!kb) throw new Error(`Unknown finding id: ${id}`);
  return {
    id,
    title: kb.title,
    category: kb.category,
    severity: severity || kb.severity,
    description: kb.description,
    attack: kb.attack,
    fix: kb.fix,
    references: kb.references || [],
    evidence: evidence || null,
    ...extra,
  };
}

/** One raw HTTP(S) request to a pre-validated, SSRF-safe target. */
function rawRequest(urlObj, { method = 'GET', headers = {}, pinnedAddress, pinnedFamily }) {
  return new Promise((resolve, reject) => {
    const isHttps = urlObj.protocol === 'https:';
    const transport = isHttps ? https : http;

    const options = {
      method,
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      headers: {
        'User-Agent': 'GMC-VulnScanner/1.0 (+passive security header/config checker)',
        Accept: '*/*',
        Connection: 'close',
        ...headers,
      },
      timeout: REQUEST_TIMEOUT_MS,
      // Pin the connection to the address we already validated, so a DNS
      // rebind between validation and connection can't route us somewhere
      // private.
      lookup: (_hostname, opts, cb) => {
        if (opts && opts.all) return cb(null, [{ address: pinnedAddress, family: pinnedFamily }]);
        return cb(null, pinnedAddress, pinnedFamily);
      },
      autoSelectFamily: false,
      servername: isHttps ? urlObj.hostname : undefined,
      rejectUnauthorized: false, // we inspect the cert ourselves, deliberately
    };

    const req = transport.request(options, (res) => {
      const chunks = [];
      let bytes = 0;
      let truncated = false;

      res.on('data', (chunk) => {
        if (bytes >= MAX_BODY_BYTES) {
          truncated = true;
          return;
        }
        const room = MAX_BODY_BYTES - bytes;
        const slice = chunk.length > room ? chunk.subarray(0, room) : chunk;
        chunks.push(slice);
        bytes += slice.length;
        if (bytes >= MAX_BODY_BYTES) {
          truncated = true;
          res.destroy();
        }
      });

      res.on('end', () => finish());
      res.on('close', () => finish());

      let finished = false;
      function finish() {
        if (finished) return;
        finished = true;
        let tls = null;
        if (isHttps && res.socket && res.socket.encrypted) {
          const cert = res.socket.getPeerCertificate ? res.socket.getPeerCertificate(false) : null;
          tls = {
            protocol: res.socket.getProtocol ? res.socket.getProtocol() : null,
            authorized: res.socket.authorized === true,
            authorizationError: res.socket.authorizationError || null,
            cert: cert && Object.keys(cert).length ? {
              subject: cert.subject,
              issuer: cert.issuer,
              valid_from: cert.valid_from,
              valid_to: cert.valid_to,
              subjectaltname: cert.subjectaltname,
            } : null,
          };
        }
        const bodyBuffer = Buffer.concat(chunks);
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          rawHeaderPairs: res.rawHeaders,
          body: bodyBuffer.toString('utf8'),
          bodyBuffer,
          truncated,
          tls,
          finalUrl: urlObj.toString(),
        });
      }
    });

    req.on('timeout', () => req.destroy(new Error('Request timed out')));
    req.on('error', reject);
    req.end();
  });
}

/** Resolves+validates the host, then performs the request. */
async function safeRequest(urlString, opts = {}) {
  const urlObj = new URL(urlString);
  if (urlObj.protocol !== 'http:' && urlObj.protocol !== 'https:') {
    throw new Error(`Unsupported protocol: ${urlObj.protocol}`);
  }
  const { address, family } = await resolveAndValidateHost(urlObj.hostname);
  return rawRequest(urlObj, { ...opts, pinnedAddress: address, pinnedFamily: family });
}

/** Follows redirects manually so every hop gets its own SSRF validation. */
async function fetchFollowingRedirects(urlString, opts = {}) {
  let current = urlString;
  const chain = [];
  for (let i = 0; i <= MAX_REDIRECTS; i++) {
    const res = await safeRequest(current, opts);
    chain.push({ url: current, status: res.statusCode });
    if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
      current = new URL(res.headers.location, current).toString();
      continue;
    }
    return { ...res, finalUrl: current, redirectChain: chain };
  }
  throw new Error('Too many redirects');
}

function getHeader(headers, name) {
  const key = Object.keys(headers).find((k) => k.toLowerCase() === name.toLowerCase());
  return key ? headers[key] : undefined;
}

function parseCookies(rawHeaderPairs) {
  const cookies = [];
  for (let i = 0; i < rawHeaderPairs.length; i += 2) {
    if (rawHeaderPairs[i].toLowerCase() === 'set-cookie') {
      cookies.push(rawHeaderPairs[i + 1]);
    }
  }
  return cookies;
}

function daysBetween(a, b) {
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}

// Every candidate carries a content signature: matching a real 404/soft-404
// page (a full HTML app shell, a "not found" route, a WAF challenge page)
// is common on modern sites and would otherwise look identical to a "found"
// response by status/length alone — the signature is what tells a real
// exposed file apart from a site that just happens to return 200 for any
// path (e.g. slug-routed sites like GitHub, npm, etc.).
const SENSITIVE_PATHS = [
  { path: '/.env', signature: /^[ \t]*[A-Z][A-Z0-9_]*[ \t]*=/m, notHtml: true },
  { path: '/.git/HEAD', signature: /^ref:\s*refs\/|^[0-9a-f]{40}\s*$/ },
  { path: '/.git/config', signature: /\[core\]/ },
  { path: '/.svn/entries', signature: /^\d+\s*\n(dir|file)/ },
  { path: '/.htpasswd', signature: /^[^\s:]+:\$?(apr1|2y|1)?\$?[\w./$]{8,}$/m },
  { path: '/wp-config.php.bak', signature: /<\?php|DB_PASSWORD|DB_NAME/i },
  { path: '/config.php.bak', signature: /<\?php|define\(/i },
  { path: '/backup.zip', magicBytes: (buf) => buf.length >= 2 && buf[0] === 0x50 && buf[1] === 0x4b },
  { path: '/backup.sql', signature: /CREATE TABLE|INSERT INTO|-- (MySQL|PostgreSQL|MariaDB) dump/i },
  { path: '/database.sql', signature: /CREATE TABLE|INSERT INTO|-- (MySQL|PostgreSQL|MariaDB) dump/i },
  { path: '/.DS_Store', magicBytes: (buf) => buf.length >= 8 && buf.subarray(4, 8).toString('latin1') === 'Bud1' },
  { path: '/server-status', signature: /Apache Server Status|Server Version:/i },
  { path: '/phpinfo.php', signature: /phpinfo\(\)|<title>phpinfo|PHP Version/i },
  { path: '/.aws/credentials', signature: /aws_access_key_id/i },
  { path: '/id_rsa', signature: /BEGIN (RSA |OPENSSH |EC |DSA )?PRIVATE KEY/ },
];

const VULNERABLE_LIBS = [
  { name: 'jQuery', pattern: /jquery[.-](\d+\.\d+\.\d+)/i, isVulnerable: (v) => cmpVersion(v, '3.5.0') < 0, note: 'versions before 3.5.0 have known XSS issues (CVE-2020-11022/11023)' },
  { name: 'Bootstrap', pattern: /bootstrap[.-](\d+\.\d+\.\d+)/i, isVulnerable: (v) => cmpVersion(v, '3.4.0') < 0, note: 'versions before 3.4.0 have known XSS issues in tooltip/affix' },
  { name: 'AngularJS', pattern: /angular(?:\.min)?\.js\?v=|angular[.-](\d+\.\d+\.\d+)/i, isVulnerable: (v) => v && cmpVersion(v, '1.6.0') < 0, note: 'versions before 1.6 have known sandbox-escape XSS issues' },
  { name: 'Handlebars', pattern: /handlebars[.-](\d+\.\d+\.\d+)/i, isVulnerable: (v) => cmpVersion(v, '4.3.0') < 0, note: 'versions before 4.3.0 have known prototype-pollution issues' },
  { name: 'Lodash', pattern: /lodash[.-](\d+\.\d+\.\d+)/i, isVulnerable: (v) => cmpVersion(v, '4.17.12') < 0, note: 'versions before 4.17.12 have known prototype-pollution issues' },
];

function cmpVersion(a, b) {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    if ((pa[i] || 0) !== (pb[i] || 0)) return (pa[i] || 0) - (pb[i] || 0);
  }
  return 0;
}

async function runScan(targetUrlString, { onEvent = () => {} } = {}) {
  const findings = [];
  const notes = [];
  const emit = (type, data) => onEvent({ type, ...data });
  const add = (id, opts) => {
    const f = makeFinding(id, opts);
    findings.push(f);
    emit('finding', { finding: f });
    return f;
  };

  let urlObj;
  try {
    urlObj = new URL(targetUrlString);
    if (!urlObj.hostname) throw new Error('missing host');
  } catch {
    throw new Error(`"${targetUrlString}" is not a valid URL. Include the protocol, e.g. https://example.com`);
  }
  if (urlObj.protocol !== 'http:' && urlObj.protocol !== 'https:') {
    throw new Error('Only http:// and https:// targets are supported.');
  }

  emit('progress', { step: 'resolve', label: `Resolving ${urlObj.hostname}...` });
  await resolveAndValidateHost(urlObj.hostname); // throws early with a clear message if unsafe

  emit('progress', { step: 'fetch', label: `Fetching ${urlObj.toString()}...` });
  const main = await fetchFollowingRedirects(urlObj.toString());
  const finalUrl = new URL(main.finalUrl);
  const isHttps = finalUrl.protocol === 'https:';

  // --- HTTPS / TLS -----------------------------------------------------
  emit('progress', { step: 'tls', label: 'Checking HTTPS & TLS configuration...' });
  if (!isHttps) {
    add('no-https');
  } else {
    const tls = main.tls;
    if (tls) {
      if (tls.protocol && /TLSv1$|TLSv1\.1|SSLv3/.test(tls.protocol)) {
        add('tls-weak-protocol', { evidence: `Negotiated protocol: ${tls.protocol}` });
      }
      if (tls.cert) {
        const now = new Date();
        const validTo = new Date(tls.cert.valid_to);
        if (!isNaN(validTo)) {
          const daysLeft = daysBetween(now, validTo);
          if (daysLeft < 0) {
            add('tls-cert-expired', { evidence: `Expired ${-daysLeft} day(s) ago (${tls.cert.valid_to})` });
          } else if (daysLeft <= 14) {
            add('tls-cert-expiring-soon', { evidence: `Expires in ${daysLeft} day(s) (${tls.cert.valid_to})` });
          }
        }
        const hostMatches = certMatchesHost(tls.cert, finalUrl.hostname);
        if (!tls.authorized && /unable to verify|self.signed|self signed/i.test(tls.authorizationError || '')) {
          add('tls-cert-untrusted', { evidence: tls.authorizationError });
        } else if (!hostMatches) {
          add('tls-cert-hostname-mismatch', { evidence: `Certificate covers: ${tls.cert.subjectaltname || tls.cert.subject?.CN || 'unknown'}` });
        } else if (!tls.authorized) {
          add('tls-cert-untrusted', { evidence: tls.authorizationError || 'Certificate chain did not validate' });
        }
      }
    }
  }

  // --- Security headers --------------------------------------------------
  emit('progress', { step: 'headers', label: 'Checking security headers...' });
  const headers = main.headers;

  if (isHttps) {
    const hsts = getHeader(headers, 'strict-transport-security');
    if (!hsts) {
      add('hsts-missing');
    } else {
      const maxAgeMatch = /max-age=(\d+)/i.exec(hsts);
      const maxAge = maxAgeMatch ? Number(maxAgeMatch[1]) : 0;
      if (maxAge < 15_552_000 || !/includesubdomains/i.test(hsts)) {
        add('hsts-weak', { evidence: hsts });
      }
    }
  }

  const csp = getHeader(headers, 'content-security-policy');
  if (!csp) {
    add('csp-missing');
  } else if (/unsafe-inline|unsafe-eval|(^|[\s;])\*(?=[\s;]|$)/i.test(csp)) {
    add('csp-weak', { evidence: csp.length > 300 ? csp.slice(0, 300) + '…' : csp });
  }

  const xfo = getHeader(headers, 'x-frame-options');
  const frameAncestors = csp && /frame-ancestors/i.test(csp);
  if (!xfo && !frameAncestors) {
    add('clickjacking');
  }

  if (!getHeader(headers, 'x-content-type-options')) {
    add('xcto-missing');
  }
  if (!getHeader(headers, 'referrer-policy')) {
    add('referrer-policy-missing');
  }
  if (!getHeader(headers, 'permissions-policy')) {
    add('permissions-policy-missing');
  }

  const server = getHeader(headers, 'server');
  const poweredBy = getHeader(headers, 'x-powered-by');
  if ((server && /[\d.]/.test(server)) || poweredBy) {
    add('server-banner-disclosure', { evidence: [server, poweredBy].filter(Boolean).join(' | ') });
  }

  // --- Cookies -------------------------------------------------------
  const cookies = parseCookies(main.rawHeaderPairs);
  for (const cookie of cookies) {
    const name = cookie.split('=')[0];
    const lower = cookie.toLowerCase();
    const looksSensitive = /session|auth|token|sid|login|jwt/i.test(name);
    if (isHttps && !lower.includes('secure')) {
      add('cookie-missing-secure', { evidence: `Cookie "${name}"` });
    }
    if (looksSensitive && !lower.includes('httponly')) {
      add('cookie-missing-httponly', { evidence: `Cookie "${name}" looks like a session/auth cookie` });
    }
    if (!/samesite=/i.test(lower)) {
      add('cookie-missing-samesite', { evidence: `Cookie "${name}"` });
    }
  }

  // --- CORS ------------------------------------------------------------
  emit('progress', { step: 'cors', label: 'Checking CORS configuration...' });
  try {
    const probeOrigin = 'https://cors-check.invalid';
    const corsRes = await safeRequestForUrl(finalUrl, {
      method: 'OPTIONS',
      headers: { Origin: probeOrigin, 'Access-Control-Request-Method': 'GET' },
    });
    const acao = getHeader(corsRes.headers, 'access-control-allow-origin');
    const acac = getHeader(corsRes.headers, 'access-control-allow-credentials');
    if (acao === '*' && /true/i.test(acac || '')) {
      add('cors-wildcard-credentials', { evidence: `ACAO: ${acao}, ACAC: ${acac}` });
    } else if (acao === probeOrigin && /true/i.test(acac || '')) {
      add('cors-wildcard-credentials', { evidence: `Origin reflected: ${acao}, ACAC: ${acac}` });
    } else if (acao === '*' || acao === probeOrigin) {
      add('cors-wildcard', { evidence: `ACAO: ${acao}` });
    }

    const allow = getHeader(corsRes.headers, 'allow');
    if (allow && /\b(PUT|DELETE|TRACE|CONNECT)\b/i.test(allow)) {
      add('dangerous-http-methods', { evidence: `Allow: ${allow}` });
    }
  } catch {
    notes.push('CORS/OPTIONS probe failed (server may not support OPTIONS) — skipped.');
  }

  // --- robots.txt & security.txt -------------------------------------
  emit('progress', { step: 'meta', label: 'Checking robots.txt and security.txt...' });
  try {
    const robots = await safeRequestForUrl(new URL('/robots.txt', finalUrl));
    if (robots.statusCode === 200) {
      const disallows = [...robots.body.matchAll(/Disallow:\s*(\S+)/gi)].map((m) => m[1]);
      const sensitive = disallows.filter((p) => /admin|internal|staff|staging|dev|backup|private|manage|console/i.test(p));
      if (sensitive.length) {
        add('robots-sensitive-hint', { evidence: sensitive.slice(0, 15).join(', ') });
      }
    }
  } catch {
    notes.push('robots.txt check failed — skipped.');
  }
  try {
    const secTxt = await safeRequestForUrl(new URL('/.well-known/security.txt', finalUrl));
    if (secTxt.statusCode !== 200) {
      add('security-txt-missing');
    }
  } catch {
    add('security-txt-missing');
  }

  // --- Sensitive file / path exposure ---------------------------------
  // A 200 status alone doesn't mean much: plenty of sites (GitHub, npm,
  // any slug-routed app) return HTTP 200 with a real rendered page for
  // almost any top-level path. So status/length is only used as a weak
  // fallback signal — the real check is whether the response actually
  // *looks like* the file it would be (a git ref, KEY=VALUE lines, an
  // Apache status page, a zip's magic bytes, etc).
  emit('progress', { step: 'paths', label: 'Checking for exposed sensitive files...' });
  const found = [];
  for (const candidate of SENSITIVE_PATHS) {
    try {
      const res = await safeRequestForUrl(new URL(candidate.path, finalUrl));
      if (res.statusCode === 200) {
        let matched = false;
        if (candidate.magicBytes) {
          matched = candidate.magicBytes(res.bodyBuffer);
        } else if (candidate.signature) {
          matched = candidate.signature.test(res.body) && !(candidate.notHtml && /<html[\s>]/i.test(res.body));
        }
        if (matched) {
          found.push({ path: candidate.path, status: res.statusCode, length: res.body.length });
        }
      }
      if (/index of \//i.test(res.body) || /<title>index of/i.test(res.body)) {
        add('directory-listing-enabled', { evidence: candidate.path });
      }
    } catch {
      // unreachable path — not a finding, just skip
    }
    await new Promise((r) => setTimeout(r, 60)); // stay polite to the target
  }
  for (const f of found) {
    add('sensitive-file-exposed', { evidence: `${f.path} → HTTP ${f.status}, ${f.length} bytes` });
  }

  // --- Mixed content & outdated libraries (from the already-fetched body) -
  emit('progress', { step: 'content', label: 'Scanning page content...' });
  if (isHttps) {
    const httpRefs = [...main.body.matchAll(/(?:src|href)=["']http:\/\/[^"']+["']/gi)].map((m) => m[0]);
    if (httpRefs.length) {
      add('mixed-content', { evidence: httpRefs.slice(0, 5).join(', ') + (httpRefs.length > 5 ? `, +${httpRefs.length - 5} more` : '') });
    }
  }
  for (const lib of VULNERABLE_LIBS) {
    const match = lib.pattern.exec(main.body);
    if (match && match[1] && lib.isVulnerable(match[1])) {
      add('outdated-js-library', { evidence: `${lib.name} ${match[1]} — ${lib.note}` });
    }
  }

  emit('progress', { step: 'score', label: 'Scoring results...' });
  const result = buildResult(targetUrlString, finalUrl.toString(), findings, notes, main);
  emit('done', { result });
  return result;

  // local helper bound to the already-validated host+redirect target
  async function safeRequestForUrl(u, opts) {
    return safeRequest(u.toString(), opts);
  }
}

function certMatchesHost(cert, hostname) {
  const names = [];
  if (cert.subject && cert.subject.CN) names.push(cert.subject.CN);
  if (cert.subjectaltname) {
    for (const part of cert.subjectaltname.split(',')) {
      const m = /DNS:(.+)/.exec(part.trim());
      if (m) names.push(m[1]);
    }
  }
  return names.some((n) => wildcardMatch(n, hostname));
}

function wildcardMatch(pattern, host) {
  if (pattern === host) return true;
  if (pattern.startsWith('*.')) {
    const suffix = pattern.slice(1); // ".example.com"
    return host.endsWith(suffix) && host.slice(0, -suffix.length).indexOf('.') === -1;
  }
  return false;
}

function buildResult(requestedUrl, finalUrl, findings, notes, main) {
  let score = 100;
  for (const f of findings) score -= SEVERITY_WEIGHT[f.severity] || 0;
  score = Math.max(0, Math.min(100, score));
  const grade = score >= 90 ? 'A' : score >= 80 ? 'B' : score >= 70 ? 'C' : score >= 60 ? 'D' : 'F';

  const bySeverity = Object.fromEntries(SEVERITY_ORDER.map((s) => [s, 0]));
  for (const f of findings) bySeverity[f.severity] = (bySeverity[f.severity] || 0) + 1;

  const sorted = [...findings].sort((a, b) => SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity));

  return {
    requestedUrl,
    finalUrl,
    scannedAt: new Date().toISOString(),
    httpStatus: main.statusCode,
    redirectChain: main.redirectChain,
    score,
    grade,
    bySeverity,
    findings: sorted,
    notes,
  };
}

module.exports = { runScan };
