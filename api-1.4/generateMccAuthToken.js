// generateMccAuthToken.js

// Require our MCC module (ensure the path is correct)
const mcc = require('./app/mcc.js');

// Replace these with your stored Base64 keys (obtained securely)
const base64PrivateKey = 'YOUR_PRIVATE_KEY_BASE64';
const base64PublicKey = 'YOUR_PUBLIC_KEY_BASE64';

// Set the recordID (this should match the record you're trying to access)
const recordID = 'medrec:1713255477778'; // example record ID

// Create a challenge using the record ID
const challenge = `access_medical_record:${recordID}`;

// Decode the keys from Base64 to Uint8Array
const privateKey = mcc.decodeKey(base64PrivateKey);
const publicKey = mcc.decodeKey(base64PublicKey);

// Sign the challenge using your private key
const signature = mcc.signMessage(privateKey, challenge);

// Build the authentication token as a JSON string
const mccAuthToken = JSON.stringify({
  signature: signature,       // signature is already Base64-encoded from signMessage()
  publicKey: base64PublicKey    // include your public key (as it was stored in Base64)
});

console.log('Paste this into Postman as your mccAuthToken:');
console.log(mccAuthToken);
