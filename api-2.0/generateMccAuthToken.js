// // generateMccAuthToken.js

// const mcc = require('./app/mcc.js');

// // 1) Paste in the *exact* Base64 keys returned when you registered:
// const base64PrivateKey = '8en6syLBFAVj7J82MvXOt43/nOycfPHVifLAZqC5ywQ=';
// const base64PublicKey  = 'ysaGP9GTWpi714V4ACXgbCQU27NG2BFrh7IPWAxp6nQ=';

// // 2) Use the real recordID you created earlier:
// const recordID = 'medrec:f485866764ea661172565edc6cff5787eaa34545e4a682c5f2f7b0890a0f2b43';

// // 3) Form the challenge string *exactly* as your server expects:
// const challenge = `access_medical_record:${recordID}`;

// // 4) Sign it (no decodeKey here—signMessage will decode your Base64 seed for you):
// const signature = mcc.signMessage(base64PrivateKey, challenge);

// // 5) Build the token payload exactly how your GET endpoint needs it:
// const mccAuthToken = JSON.stringify({
//   publicKey: base64PublicKey,
//   signature
// });

// console.log('Copy-and-paste THIS into Postman as your mccAuthToken (Postman will URL‑encode it):');
// console.log(mccAuthToken);
// generateMccAuthToken.js
const mcc = require('./app/mcc');

// Usage:
// node generateMccAuthToken.js <recordID> <mccSigningPrivateKey> <mccSigningPublicKey>

const [ , , recordID, base64SigningPrivKey, base64SigningPubKey ] = process.argv;

if (!recordID || !base64SigningPrivKey || !base64SigningPubKey) {
  console.error('Usage: node generateMccAuthToken.js <recordID> <signingPrivateKey> <signingPublicKey>');
  process.exit(1);
}

//const challenge = `access_medical_record:${prescriptionID}`;
const challenge = `access_medical_record:${recordID}`
const signature = mcc.signMessage(base64SigningPrivKey, challenge);

const authToken = {
  publicKey: base64SigningPubKey,
  signature
};

console.log(JSON.stringify(authToken, null, 2));

