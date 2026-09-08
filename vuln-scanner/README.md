# GMC Vulnerability Scanner

A passive, non-destructive website security scanner: it checks HTTPS/TLS
configuration, security headers, cookie flags, CORS setup, common exposed
files, and a few other well-known misconfiguration classes — then explains,
for each finding, **how an attacker would actually use it** and **exactly
how to fix it**. It ships as both a local web dashboard and a CLI that
produces a standalone HTML report.

Zero dependencies — everything runs on Node's built-in `http`/`https`/`tls`
modules. There is nothing to `npm install`.

## Why this isn't a plain static page

A browser-only page cannot inspect another site's response headers or TLS
certificate for security purposes — cross-origin requests are blocked by
the browser's own CORS protections, which is exactly the kind of thing this
tool checks for. So this runs as a tiny local server: it makes the request
itself (server-side, no CORS involved), and serves you a normal web UI to
drive it and read the results.

## Use responsibly

**Only scan a website you own, or one you have explicit permission to
test.** Scanning third-party websites without authorization can be illegal
in many jurisdictions, even when every check is passive and non-destructive
like the ones here. The web UI requires you to confirm authorization before
each scan; that checkbox is a reminder, not a technical enforcement
mechanism — the responsibility is yours.

This tool deliberately does **not**:
- inject SQL/XSS/command payloads or attempt any kind of exploitation
- brute-force logins or credentials
- perform load/denial-of-service testing
- port-scan beyond the site's own declared web port
- crawl or brute-force a directory wordlist (it checks a short, curated
  list of known-sensitive paths, not thousands of guesses)

It also refuses to scan private/internal addresses (localhost, RFC1918
ranges, link-local addresses including the `169.254.169.254` cloud metadata
endpoint) — so it can't be pointed at internal infrastructure, including
its own host, even by accident.

## Run the dashboard

```sh
cd vuln-scanner
node server.js
```

Open http://localhost:8787, enter a URL, confirm you're authorized to test
it, and click **Scan**. Findings stream in live; the final report shows an
overall grade (A–F), a score, and every finding grouped by severity with:

- what the issue is
- the evidence found (the actual header/response value)
- how an attacker could use it against the site
- exactly how to fix it, with a reference where relevant

Export a scan as JSON, or use **Print / Save PDF** for a shareable report.

## Run from the command line

```sh
node cli.js https://example.com
node cli.js https://example.com --out report.html
node cli.js https://example.com --json > result.json
```

The CLI prints a live log to the terminal and writes a self-contained HTML
report (same look as the dashboard) that you can open in any browser or
send to someone else.

## What it checks

| Area | Checks |
| --- | --- |
| Transport security | HTTPS enforced, TLS protocol version, certificate validity/expiry/hostname match |
| HTTP headers | HSTS, Content-Security-Policy, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, dangerous HTTP methods |
| Cookies | Secure, HttpOnly, SameSite flags |
| CORS | Wildcard/reflected origins, especially combined with credentials |
| Information disclosure | Server/X-Powered-By banners, directory listings, robots.txt hints at sensitive paths |
| Exposed files | `.env`, `.git`, backup files, credential files, and similar at predictable paths |
| Content | Mixed HTTP content on HTTPS pages, outdated front-end libraries with known CVEs |
| Best practice | `/.well-known/security.txt` presence |

Full explanations for each check — what it means, how it's abused, and how
to fix it — live in `knowledge-base.js`.

## Project layout

| File | What it is |
| --- | --- |
| `ssrf-guard.js` | Validates and pins the target address before any request, blocking internal/private targets |
| `scanner.js` | The scan engine: safe HTTP client, TLS inspection, all checks, scoring |
| `knowledge-base.js` | Per-check title, severity, attacker explanation, and fix, in plain English |
| `server.js` | Zero-dependency HTTP server: serves the UI and streams scan progress over SSE |
| `public/` | The dashboard UI (`index.html`, `styles.css`, `app.js`) |
| `cli.js` | Headless scan + standalone HTML report generator, reusing `public/`'s render code |

## Limitations

This is a posture scanner, not a penetration test. A clean report (grade A,
no findings) means the site passed this specific set of passive checks —
it is not a guarantee the site has no vulnerabilities. Business-logic
flaws, authentication/authorization bugs, injection vulnerabilities in
application code, and anything requiring active testing are out of scope
by design and need a proper authorized penetration test or a code-level
security review instead.
