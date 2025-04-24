// mcc.js
const nacl = require('tweetnacl');
nacl.util = require('tweetnacl-util');

module.exports = {
  generateKeyPair() {
    return nacl.box.keyPair();
  },

  generateSharedSecret(privateKey, publicKey) {
    return nacl.box.before(publicKey, privateKey);
  },

  encryptData(message, sharedSecret) {
    const nonce = nacl.randomBytes(nacl.box.nonceLength);
    const messageUint8 = nacl.util.decodeUTF8(message);
    const box = nacl.box.after(messageUint8, nonce, sharedSecret);
    return {
      nonce: nacl.util.encodeBase64(nonce),
      ciphertext: nacl.util.encodeBase64(box)
    };
  },

  decryptData(ciphertextBase64, nonceBase64, sharedSecret) {
    const ciphertext = nacl.util.decodeBase64(ciphertextBase64);
    const nonce = nacl.util.decodeBase64(nonceBase64);
    const messageUint8 = nacl.box.open.after(ciphertext, nonce, sharedSecret);
    if (!messageUint8) throw new Error('Decryption failed.');
    return nacl.util.encodeUTF8(messageUint8);
  },

  signMessage(privateKey, message) {
    return nacl.util.encodeBase64(
      nacl.sign.detached(nacl.util.decodeUTF8(message), privateKey)
    );
  },

  verifySignature(publicKey, message, signatureBase64) {
    return nacl.sign.detached.verify(
      nacl.util.decodeUTF8(message),
      nacl.util.decodeBase64(signatureBase64),
      publicKey
    );
  },

  encodeKey(key) {
    return nacl.util.encodeBase64(key);
  },

  decodeKey(keyStr) {
    return nacl.util.decodeBase64(keyStr);
  }
};
