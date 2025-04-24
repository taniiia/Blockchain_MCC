const nacl = require('tweetnacl');
nacl.util = require('tweetnacl-util');

module.exports = {
  // ========== KEY GENERATION ==========

  // For encryption / shared secret (X25519 / Curve25519)
  generateBoxKeyPair() {
    return nacl.box.keyPair();
  },

  // For signing (Ed25519)
  generateSignKeyPair() {
    return nacl.sign.keyPair();
  },

  // ========== ENCODE / DECODE KEYS ==========

  encodeKey(keyUint8Array) {
    return Buffer.from(keyUint8Array).toString('base64');
  },

  decodeKey(base64String) {
    return new Uint8Array(Buffer.from(base64String, 'base64'));
  },

  // ========== SIGNATURES ==========

  signMessage(privateKeyBase64, message) {
    const secretKey = this.decodeKey(privateKeyBase64); // 64 bytes
    const messageBytes = nacl.util.decodeUTF8(message);
    const signed = nacl.sign.detached(messageBytes, secretKey);
    return this.encodeKey(signed);
  },

  verifySignature(publicKeyBase64, message, signatureBase64) {
    const publicKey = this.decodeKey(publicKeyBase64);
    const messageBytes = nacl.util.decodeUTF8(message);
    const signature = this.decodeKey(signatureBase64);
    return nacl.sign.detached.verify(messageBytes, signature, publicKey);
  },

  // ========== ENCRYPTION / DECRYPTION ==========

  generateSharedSecret(privateKeyUint8, publicKeyUint8) {
    return nacl.box.before(publicKeyUint8, privateKeyUint8); // shared secret
  },

  encryptData(plaintext, sharedSecret) {
    const nonce = nacl.randomBytes(nacl.box.nonceLength);
    const messageBytes = nacl.util.decodeUTF8(plaintext);
    const ciphertext = nacl.box.after(messageBytes, nonce, sharedSecret);
    return {
      ciphertext: this.encodeKey(ciphertext),
      nonce: this.encodeKey(nonce)
    };
  },

  decryptData(ciphertextBase64, nonceBase64, sharedSecret) {
    const ciphertext = this.decodeKey(ciphertextBase64);
    const nonce = this.decodeKey(nonceBase64);
    const decrypted = nacl.box.open.after(ciphertext, nonce, sharedSecret);
    if (!decrypted) {
      throw new Error('Failed to decrypt data.');
    }
    return nacl.util.encodeUTF8(decrypted);
  }
};
