// Guards against the scanner being turned into an SSRF tool: refuses to let
// the server fetch a target that resolves to a private, loopback, link-local
// or otherwise internal address (including cloud metadata endpoints).
'use strict';

const dns = require('node:dns').promises;
const net = require('node:net');

function ipv4ToLong(ip) {
  const parts = ip.split('.').map(Number);
  return ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0;
}

function inCidr4(ip, base, bits) {
  const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
  return (ipv4ToLong(ip) & mask) === (ipv4ToLong(base) & mask);
}

const PRIVATE_V4_RANGES = [
  ['0.0.0.0', 8],
  ['10.0.0.0', 8],
  ['100.64.0.0', 10], // carrier-grade NAT
  ['127.0.0.0', 8], // loopback
  ['169.254.0.0', 16], // link-local incl. cloud metadata (169.254.169.254)
  ['172.16.0.0', 12],
  ['192.0.0.0', 24], // IETF protocol assignments
  ['192.0.2.0', 24], // TEST-NET
  ['192.168.0.0', 16],
  ['198.18.0.0', 15], // benchmarking
  ['224.0.0.0', 4], // multicast
  ['240.0.0.0', 4], // reserved
];

function isPrivateIPv4(ip) {
  return PRIVATE_V4_RANGES.some(([base, bits]) => inCidr4(ip, base, bits));
}

function isPrivateIPv6(ip) {
  const norm = ip.toLowerCase();
  if (norm === '::1' || norm === '::') return true;
  if (norm.startsWith('::ffff:')) {
    const embedded = norm.slice(7);
    if (net.isIPv4(embedded)) return isPrivateIPv4(embedded);
  }
  if (/^fe[89ab][0-9a-f]:/.test(norm)) return true; // link-local fe80::/10
  if (/^f[cd][0-9a-f]{2}:/.test(norm)) return true; // unique local fc00::/7
  if (norm.startsWith('ff')) return true; // multicast
  return false;
}

function isPrivateOrReservedIP(ip) {
  if (net.isIPv4(ip)) return isPrivateIPv4(ip);
  if (net.isIPv6(ip)) return isPrivateIPv6(ip);
  return true; // unknown shape: fail closed
}

const BLOCKED_HOSTNAMES = new Set(['localhost', 'localhost.localdomain', 'metadata.google.internal']);

/**
 * Resolves a hostname and rejects it if it (or any of its resolved
 * addresses) points at an internal/private network. Returns the pinned IP +
 * family to use for the actual connection, so a subsequent DNS lookup
 * (rebinding) can't swap in a different, private address after the check.
 */
async function resolveAndValidateHost(hostname) {
  if (BLOCKED_HOSTNAMES.has(hostname.toLowerCase())) {
    throw new Error(`Refusing to scan "${hostname}": internal hostname.`);
  }
  if (net.isIP(hostname)) {
    if (isPrivateOrReservedIP(hostname)) {
      throw new Error(`Refusing to scan ${hostname}: private/reserved IP address.`);
    }
    return { address: hostname, family: net.isIPv6(hostname) ? 6 : 4 };
  }

  let records;
  try {
    records = await dns.lookup(hostname, { all: true, verbatim: true });
  } catch {
    throw new Error(`Could not resolve hostname "${hostname}".`);
  }
  if (records.length === 0) {
    throw new Error(`Hostname "${hostname}" did not resolve to any address.`);
  }
  if (records.some((r) => isPrivateOrReservedIP(r.address))) {
    throw new Error(`Refusing to scan "${hostname}": resolves to a private/internal address.`);
  }
  const chosen = records[0];
  return { address: chosen.address, family: chosen.family };
}

module.exports = { resolveAndValidateHost, isPrivateOrReservedIP };
