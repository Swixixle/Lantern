/**
 * Tests for encryption utilities.
 * 
 * Verifies AES-256-GCM encryption/decryption functionality.
 */

import { encrypt, decrypt, encryptString, decryptString, encryptFile, decryptFile, deriveKey } from "../encryption";

describe("Encryption Utilities", () => {
  describe("deriveKey", () => {
    it("should derive a 32-byte key from passphrase", () => {
      const key = deriveKey("test-passphrase");
      expect(key.length).toBe(32);
    });

    it("should produce deterministic keys", () => {
      const key1 = deriveKey("same-passphrase");
      const key2 = deriveKey("same-passphrase");
      expect(key1.equals(key2)).toBe(true);
    });

    it("should produce different keys for different passphrases", () => {
      const key1 = deriveKey("passphrase-1");
      const key2 = deriveKey("passphrase-2");
      expect(key1.equals(key2)).toBe(false);
    });
  });

  describe("encrypt/decrypt", () => {
    it("should encrypt and decrypt a Buffer", () => {
      const plaintext = Buffer.from("sensitive data", "utf8");
      const key = deriveKey("test-key");
      
      const encrypted = encrypt(plaintext, key);
      expect(encrypted.algorithm).toBe("aes-256-gcm");
      expect(encrypted.iv).toBeTruthy();
      expect(encrypted.ciphertext).toBeTruthy();
      
      const decrypted = decrypt(encrypted, key);
      expect(decrypted.equals(plaintext)).toBe(true);
    });

    it("should encrypt and decrypt a string", () => {
      const plaintext = "confidential information";
      const key = deriveKey("test-key");
      
      const encrypted = encrypt(plaintext, key);
      const decrypted = decrypt(encrypted, key);
      
      expect(decrypted.toString("utf8")).toBe(plaintext);
    });

    it("should fail decryption with wrong key", () => {
      const plaintext = "secret data";
      const key1 = deriveKey("correct-key");
      const key2 = deriveKey("wrong-key");
      
      const encrypted = encrypt(plaintext, key1);
      
      expect(() => decrypt(encrypted, key2)).toThrow("Decryption failed");
    });

    it("should produce different ciphertexts for same plaintext", () => {
      const plaintext = "same data";
      const key = deriveKey("test-key");
      
      const encrypted1 = encrypt(plaintext, key);
      const encrypted2 = encrypt(plaintext, key);
      
      // IVs should be different (randomized)
      expect(encrypted1.iv).not.toBe(encrypted2.iv);
      expect(encrypted1.ciphertext).not.toBe(encrypted2.ciphertext);
    });
  });

  describe("encryptString/decryptString", () => {
    it("should encrypt and decrypt text", () => {
      const plaintext = "This is confidential text.";
      const key = deriveKey("test-key");
      
      const encryptedJson = encryptString(plaintext, key);
      expect(typeof encryptedJson).toBe("string");
      
      const decrypted = decryptString(encryptedJson, key);
      expect(decrypted).toBe(plaintext);
    });

    it("should handle special characters", () => {
      const plaintext = "Special chars: 🔐 🔑 ñ € \\n \\t";
      const key = deriveKey("test-key");
      
      const encryptedJson = encryptString(plaintext, key);
      const decrypted = decryptString(encryptedJson, key);
      
      expect(decrypted).toBe(plaintext);
    });
  });

  describe("encryptFile/decryptFile", () => {
    it("should encrypt and decrypt file data", () => {
      const fileData = Buffer.from("file contents with binary data \\x00\\x01\\xFF", "utf8");
      const key = deriveKey("test-key");
      
      const encrypted = encryptFile(fileData, key);
      const decrypted = decryptFile(encrypted, key);
      
      expect(decrypted.equals(fileData)).toBe(true);
    });

    it("should handle large files", () => {
      // Simulate a 1MB file
      const largeFile = Buffer.alloc(1024 * 1024, "A");
      const key = deriveKey("test-key");
      
      const encrypted = encryptFile(largeFile, key);
      const decrypted = decryptFile(encrypted, key);
      
      expect(decrypted.equals(largeFile)).toBe(true);
    });
  });
});
