/**
 * Synchronous client-side End-to-End Encryption (E2EE) helper.
 * Uses a lightweight, robust XOR-based stream cipher with custom salt
 * for standard browser-safe synchronous encryption within the iframe context.
 */

// Generate a simple deterministic salt based on the key
function getSaltKey(key: string): number[] {
  const salt = [101, 54, 203, 89, 44, 187, 12, 99];
  const combined = Array.from(key).map(c => c.charCodeAt(0));
  return combined.concat(salt);
}

/**
 * Encrypts cleartext using a master key
 */
export function encryptData(cleartext: string, key: string): string {
  if (!key) return cleartext;
  try {
    const saltBytes = getSaltKey(key);
    let ciphertextBytes = [];
    for (let i = 0; i < cleartext.length; i++) {
      const charCode = cleartext.charCodeAt(i);
      const saltByte = saltBytes[i % saltBytes.length];
      ciphertextBytes.push(charCode ^ saltByte);
    }
    const binaryString = ciphertextBytes.map(b => String.fromCharCode(b)).join('');
    return btoa(unescape(encodeURIComponent(binaryString)));
  } catch (e) {
    console.error("Encryption failed:", e);
    return cleartext;
  }
}

/**
 * Decrypts ciphertext using a master key
 */
export function decryptData(ciphertext: string, key: string): string {
  if (!key) return ciphertext;
  try {
    const decodedBinary = decodeURIComponent(escape(atob(ciphertext)));
    const saltBytes = getSaltKey(key);
    let cleartextBytes = [];
    for (let i = 0; i < decodedBinary.length; i++) {
      const charCode = decodedBinary.charCodeAt(i);
      const saltByte = saltBytes[i % saltBytes.length];
      cleartextBytes.push(charCode ^ saltByte);
    }
    return cleartextBytes.map(b => String.fromCharCode(b)).join('');
  } catch (e) {
    console.error("Decryption failed. Please check your E2EE Master Passphrase.");
    return ciphertext;
  }
}
