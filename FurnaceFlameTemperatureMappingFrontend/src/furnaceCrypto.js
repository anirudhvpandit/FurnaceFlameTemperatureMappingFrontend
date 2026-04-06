/**
 * furnaceCrypto.js
 * ================
 * Browser-side counterpart to the server's crypto.py.
 *
 * Usage
 * -----
 *   import { initCrypto, encryptRequest, decryptResponse } from './furnaceCrypto.js';
 *
 *   // Call once at app start — pass the shared transit key as hex or base64url
 *   await initCrypto(import.meta.env.VITE_TRANSIT_KEY);
 *
 *   // Encrypt a request body
 *   const body = await encryptRequest({ station_id: 1, unit_id: 2 });
 *   const res  = await fetch('/history', { method: 'POST', body: JSON.stringify(body),
 *                                           headers: { 'Content-Type': 'application/json' } });
 *
 *   // Decrypt the response
 *   const data = await decryptResponse(res);
 */

// ─── Internal state ──────────────────────────────────────────
let _transitKey = null;   // CryptoKey (AES-GCM, 256-bit)

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

function _b64ToBytes(b64) {
  // Handles both standard and URL-safe base64
  const std = b64.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(std);
  return Uint8Array.from(bin, c => c.charCodeAt(0));
}

function _bytesToB64(bytes) {
  let bin = '';
  bytes.forEach(b => (bin += String.fromCharCode(b)));
  return btoa(bin);
}

function _hexToBytes(hex) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2)
    bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  return bytes;
}

function _parseKey(keyStr) {
  // Accept hex (64 chars) or base64url / base64 (44 chars)
  if (/^[0-9a-fA-F]{64}$/.test(keyStr)) return _hexToBytes(keyStr);
  return _b64ToBytes(keyStr);
}

// ─────────────────────────────────────────────────────────────
// initCrypto(keyStr)
// ─────────────────────────────────────────────────────────────
/**
 * Import the shared transit key into WebCrypto.
 *
 * @param {string} keyStr  — 32-byte key as hex (64 chars) or base64url (44 chars).
 */
export async function initCrypto(keyStr) {
  const raw = _parseKey(keyStr);
  if (raw.length !== 32) throw new Error('Transit key must be exactly 32 bytes.');

  _transitKey = await crypto.subtle.importKey(
    'raw', raw,
    { name: 'AES-GCM' },
    false,             // not extractable
    ['encrypt', 'decrypt']
  );
}

// ─────────────────────────────────────────────────────────────
// encryptRequest(data)  — Layer 1 (Transit-IN)
// ─────────────────────────────────────────────────────────────
/**
 * Encrypt a JS object so the server's transit-IN middleware can decrypt it.
 *
 * @param {*}      data  — JSON-serialisable value.
 * @returns {Object}     — { iv, tag, ct } (all base64-encoded).
 */
export async function encryptRequest(data) {
  if (!_transitKey) throw new Error('Call initCrypto() first.');

  const plaintext = new TextEncoder().encode(JSON.stringify(data));
  const iv = crypto.getRandomValues(new Uint8Array(12));   // 96-bit nonce

  // AES-GCM encrypt → returns CT || TAG (tag is last 16 bytes)
  const ctWithTag = new Uint8Array(
    await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, _transitKey, plaintext)
  );

  const ct  = ctWithTag.slice(0, -16);
  const tag = ctWithTag.slice(-16);

  return {
    iv:  _bytesToB64(iv),
    tag: _bytesToB64(tag),
    ct:  _bytesToB64(ct),
  };
}

// ─────────────────────────────────────────────────────────────
// decryptResponse(response)  — Layer 3 (Transit-OUT)
// ─────────────────────────────────────────────────────────────
/**
 * Decrypt an encrypted response from the server.
 *
 * @param {Response} response  — fetch() Response object.
 * @returns {*}                — Parsed JS value.
 */
export async function decryptResponse(response) {
  if (!_transitKey) throw new Error('Call initCrypto() first.');

  const envelope = await response.json();

  if (!envelope.iv || !envelope.ct || !envelope.tag) {
    // Server returned a plain (non-encrypted) payload — just return it
    return envelope;
  }

  const iv  = _b64ToBytes(envelope.iv);
  const tag = _b64ToBytes(envelope.tag);
  const ct  = _b64ToBytes(envelope.ct);

  // Reconstruct CT || TAG as expected by WebCrypto
  const ctWithTag = new Uint8Array(ct.length + tag.length);
  ctWithTag.set(ct);
  ctWithTag.set(tag, ct.length);

  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    _transitKey,
    ctWithTag
  );

  return JSON.parse(new TextDecoder().decode(plaintext));
}

// ─────────────────────────────────────────────────────────────
// Convenience: encrypted fetch wrapper
// ─────────────────────────────────────────────────────────────
/**
 * Drop-in replacement for fetch() that transparently encrypts JSON bodies
 * and decrypts JSON responses.
 *
 * @example
 *   const data = await encFetch('/history/5/boiler-params');
 *   const data = await encFetch('/upload', { method: 'POST', encBody: { foo: 1 } });
 */
export async function encFetch(url, options = {}) {
  const { encBody, ...rest } = options;
  const headers = { ...(rest.headers || {}) };

  if (encBody !== undefined) {
    const encrypted = await encryptRequest(encBody);
    rest.body = JSON.stringify(encrypted);
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(url, { ...rest, headers });
  return decryptResponse(response);
}