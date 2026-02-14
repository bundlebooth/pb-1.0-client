/**
 * Client-side credential encryption utility
 * Encrypts sensitive data before sending to the server to hide from Network tab
 */

// AES-GCM encryption key (shared secret - must match backend)
// In production, this should be fetched from a secure endpoint or use asymmetric encryption
const ENCRYPTION_KEY = 'planbeau-secure-auth-key-2026!!';

/**
 * Convert string to ArrayBuffer
 */
function stringToArrayBuffer(str) {
  const encoder = new TextEncoder();
  return encoder.encode(str);
}

/**
 * Convert ArrayBuffer to Base64 string
 */
function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Generate a cryptographic key from the shared secret
 */
async function getEncryptionKey() {
  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    stringToArrayBuffer(ENCRYPTION_KEY),
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey']
  );

  return window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: stringToArrayBuffer('planbeau-salt'),
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt']
  );
}

/**
 * Encrypt credentials using AES-GCM
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {Promise<string>} Base64 encoded encrypted payload
 */
export async function encryptCredentials(email, password) {
  try {
    const data = JSON.stringify({
      email,
      password,
      timestamp: Date.now()
    });

    const key = await getEncryptionKey();
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    
    const encrypted = await window.crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv
      },
      key,
      stringToArrayBuffer(data)
    );

    // Combine IV and encrypted data
    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(encrypted), iv.length);

    return arrayBufferToBase64(combined);
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt credentials');
  }
}

/**
 * Encrypt registration data
 * @param {Object} data - Registration data including email, password, firstName, lastName
 * @returns {Promise<string>} Base64 encoded encrypted payload
 */
export async function encryptRegistrationData(data) {
  try {
    const payload = JSON.stringify({
      ...data,
      timestamp: Date.now()
    });

    const key = await getEncryptionKey();
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    
    const encrypted = await window.crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv
      },
      key,
      stringToArrayBuffer(payload)
    );

    // Combine IV and encrypted data
    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(encrypted), iv.length);

    return arrayBufferToBase64(combined);
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt registration data');
  }
}
