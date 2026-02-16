/**
 * Encryption utilities for at-rest data protection.
 * 
 * Uses AES-256-GCM for authenticated encryption with:
 * - 256-bit keys
 * - 96-bit random IVs (nonces)
 * - Authentication tags for integrity
 * 
 * SECURITY NOTES:
 * - Keys should be derived from environment variables or secure key management
 * - IVs must be unique per encryption operation
 * - Store IVs alongside ciphertext (they're not secret)
 * - Authentication tags are included in ciphertext
 */

import { createCipheriv, createDecipheriv, randomBytes, createHash } from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // 96 bits for GCM
const AUTH_TAG_LENGTH = 16; // 128 bits
const KEY_LENGTH = 32; // 256 bits

/**
 * Derives a 256-bit encryption key from a passphrase.
 * Uses SHA-256 for deterministic key derivation.
 * 
 * WARNING: This is a simple derivation. For production,
 * use PBKDF2 or Argon2 with salt and high iteration count.
 * 
 * @param passphrase - Secret passphrase or base key
 * @returns 32-byte encryption key
 */
export function deriveKey(passphrase: string): Buffer {
  return createHash("sha256").update(passphrase, "utf8").digest();
}

/**
 * Gets the encryption key from environment or uses default.
 * 
 * IMPORTANT: Set ENCRYPTION_KEY in production environment!
 * 
 * @returns Encryption key buffer
 */
export function getEncryptionKey(): Buffer {
  const keyString = process.env.ENCRYPTION_KEY || "default-dev-key-change-in-production";
  return deriveKey(keyString);
}

/**
 * Encrypted data structure.
 */
export interface EncryptedData {
  /** Base64-encoded initialization vector */
  iv: string;
  
  /** Base64-encoded ciphertext with auth tag */
  ciphertext: string;
  
  /** Algorithm used (always "aes-256-gcm") */
  algorithm: "aes-256-gcm";
}

/**
 * Encrypt data with AES-256-GCM.
 * 
 * @param plaintext - Data to encrypt (Buffer or string)
 * @param key - Encryption key (32 bytes). If not provided, uses getEncryptionKey()
 * @returns Encrypted data with IV and ciphertext
 */
export function encrypt(plaintext: Buffer | string, key?: Buffer): EncryptedData {
  const encryptionKey = key || getEncryptionKey();
  
  // Generate random IV (must be unique per encryption)
  const iv = randomBytes(IV_LENGTH);
  
  // Create cipher
  const cipher = createCipheriv(ALGORITHM, encryptionKey, iv);
  
  // Encrypt data
  const plaintextBuffer = Buffer.isBuffer(plaintext) ? plaintext : Buffer.from(plaintext, "utf8");
  const ciphertext = Buffer.concat([
    cipher.update(plaintextBuffer),
    cipher.final(),
  ]);
  
  // Get authentication tag
  const authTag = cipher.getAuthTag();
  
  // Combine ciphertext and auth tag
  const combined = Buffer.concat([ciphertext, authTag]);
  
  return {
    iv: iv.toString("base64"),
    ciphertext: combined.toString("base64"),
    algorithm: ALGORITHM,
  };
}

/**
 * Decrypt data encrypted with AES-256-GCM.
 * 
 * @param encrypted - Encrypted data structure
 * @param key - Decryption key (32 bytes). If not provided, uses getEncryptionKey()
 * @returns Decrypted plaintext as Buffer
 * @throws Error if authentication fails or decryption fails
 */
export function decrypt(encrypted: EncryptedData, key?: Buffer): Buffer {
  const decryptionKey = key || getEncryptionKey();
  
  // Parse IV
  const iv = Buffer.from(encrypted.iv, "base64");
  
  // Parse combined ciphertext + auth tag
  const combined = Buffer.from(encrypted.ciphertext, "base64");
  const ciphertext = combined.slice(0, -AUTH_TAG_LENGTH);
  const authTag = combined.slice(-AUTH_TAG_LENGTH);
  
  // Create decipher
  const decipher = createDecipheriv(ALGORITHM, decryptionKey, iv);
  decipher.setAuthTag(authTag);
  
  // Decrypt data
  try {
    const plaintext = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]);
    return plaintext;
  } catch (error) {
    throw new Error("Decryption failed: authentication tag mismatch or corrupted data");
  }
}

/**
 * Encrypt a string and return as base64.
 * Convenience wrapper for text encryption.
 * 
 * @param plaintext - Text to encrypt
 * @param key - Optional encryption key
 * @returns Base64-encoded encrypted data JSON
 */
export function encryptString(plaintext: string, key?: Buffer): string {
  const encrypted = encrypt(plaintext, key);
  return JSON.stringify(encrypted);
}

/**
 * Decrypt a base64-encoded encrypted string.
 * Convenience wrapper for text decryption.
 * 
 * @param encryptedJson - Base64-encoded encrypted data JSON
 * @param key - Optional decryption key
 * @returns Decrypted text
 */
export function decryptString(encryptedJson: string, key?: Buffer): string {
  const encrypted = JSON.parse(encryptedJson) as EncryptedData;
  const plaintext = decrypt(encrypted, key);
  return plaintext.toString("utf8");
}

/**
 * Encrypt file contents for storage.
 * 
 * @param fileBuffer - File data as Buffer
 * @param key - Optional encryption key
 * @returns Encrypted data structure
 */
export function encryptFile(fileBuffer: Buffer, key?: Buffer): EncryptedData {
  return encrypt(fileBuffer, key);
}

/**
 * Decrypt file contents from storage.
 * 
 * @param encrypted - Encrypted data structure
 * @param key - Optional decryption key
 * @returns Decrypted file data as Buffer
 */
export function decryptFile(encrypted: EncryptedData, key?: Buffer): Buffer {
  return decrypt(encrypted, key);
}
