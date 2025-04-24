'use strict';
const log4js = require('log4js');

log4js.configure({
  appenders: { out: { type: 'console' } },
  categories: { default: { appenders: ['out'], level: 'debug' } }
});

const logger = log4js.getLogger('BasicNetwork');

const bodyParser = require('body-parser');
const http = require('http');
const util = require('util');
const express = require('express')
const { expressjwt: expressJWT } = require('express-jwt');
const jwt = require('jsonwebtoken');
const bearerToken = require('express-bearer-token');
const cors = require('cors');

const constants = require('./config/constants.json');
// const config = require('./config.js');

// API‑2.0 helper modules (fabric-network based)
const helper = require('./app/helper');
const invoke = require('./app/invoke');
const qscc = require('./app/qscc');
const query = require('./app/query');
const mcc = require('./app/mcc');

const app = express();

app.options('*', cors());
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


// Set the JWT secret for signing tokens.
app.set('secret', 'thisismysecret');

// Protect all endpoints except registration and login.
app.use(expressJWT({
  secret: 'thisismysecret',
  algorithms: ['HS256'] // required in v7+
}).unless({
  path: [
    '/users',
    '/users/login',
    '/register',
    '/registerPatient',
    '/registerDoctor'
  ]
}));

app.use(bearerToken());

app.use((req, res, next) => {
  logger.debug('New request for %s', req.originalUrl);
  // Allow unprotected paths.
  if (req.originalUrl.includes('/users') ||
      req.originalUrl.includes('/users/login') ||
      req.originalUrl.includes('/register') ||
      req.originalUrl.includes('/registerPatient') ||
      req.originalUrl.includes('/registerDoctor')) {
    return next();
  }
  const token = req.token;
  jwt.verify(token, app.get('secret'), (err, decoded) => {
    if (err) {
      return res.status(403).json({
        success: false,
        message: 'Failed to authenticate token. Include token from /users as Bearer.'
      });
    } else {
      req.username = decoded.username;
      req.orgname = decoded.orgName;
      logger.debug(util.format('Decoded JWT: username - %s, orgName - %s', decoded.username, decoded.orgName));
      return next();
    }
  });
});

// Start the server.
const host = process.env.HOST || constants.host;
const port = process.env.PORT || constants.port;
const server = http.createServer(app).listen(port, () => {
  logger.info('SERVER STARTED at http://%s:%s', host, port);
});
server.timeout = 240000;

// Helper function for error messages.
function getErrorMessage(field) {
  return { success: false, message: `${field} field is missing or invalid in the request` };
}

/*
   ============= Registration Channel Endpoints =============
*/

// Register pharmacists / receptionists.
// Expects JSON: { username, orgName, role }
app.post('/users', async (req, res) => {
  const { username, orgName, role, peers } = req.body;
  if (!username || !orgName || !role) {
    return res.json(getErrorMessage('username, orgName, and role'));
  }

  // Create JWT
  const token = jwt.sign({
    exp: Math.floor(Date.now() / 1000) + parseInt(constants.jwt_expiretime),
    username,
    orgName,
    role
  }, app.get('secret'));

  // Off-chain + on-chain registration
  let response = await helper.getRegisteredUser(username, orgName, true, role);
  logger.debug('Registered user %s for org %s: %j', username, orgName, response);
  if (response && typeof response !== 'string') {
    if (peers) {
      await invoke.invokeTransaction(
        'patient-medication-channel',
        'mychaincode',
        'registerUser',
        [username, orgName, role],
        username,
        orgName,
        null
      );
    }
    // Attach JWT
    response.token = token;
    res.json(response);
  } else {
    res.json({ success: false, message: response });
  }
});

// Register patient. Expects JSON: { username, age, orgName, gender }
app.post('/registerPatient', async (req, res) => {
  const { username, age, orgName, gender, peers } = req.body;
  if (!username || !age || !orgName || !gender) {
    return res.json(getErrorMessage('username, age, orgName, and gender'));
  }

  const token = jwt.sign({
    exp: Math.floor(Date.now() / 1000) + parseInt(constants.jwt_expiretime),
    username,
    orgName,
    role: 'patient',
    age,
    gender
  }, app.get('secret'));

  let response = await helper.getRegisteredPatient(username, orgName, age, gender, true);
  if (response && typeof response !== 'string') {
    if (peers) {
      await invoke.invokeTransaction(
        'patient-medication-channel',
        'mychaincode',
        'registerPatient',
        [username, age.toString(), orgName, gender],
        username,
        orgName,
        null
      );
    }
    response.token = token;
    res.json(response);
  } else {
    res.json({ success: false, message: response });
  }
});


// Register doctor. Expects JSON: { username, gender, specialisation, orgName }
app.post('/registerDoctor', async (req, res) => {
  const { username, gender, specialisation, orgName, peers } = req.body;
  if (!username || !gender || !specialisation || !orgName) {
    return res.json(getErrorMessage('username, gender, specialisation, orgName'));
  }

  const token = jwt.sign({
    exp: Math.floor(Date.now() / 1000) + parseInt(constants.jwt_expiretime),
    username,
    orgName,
    role: 'doctor',
    gender,
    specialisation
  }, app.get('secret'));

  let response = await helper.getRegisteredDoctor(username, orgName, gender, specialisation, true);
  if (response && typeof response !== 'string') {
    if (peers) {
      await invoke.invokeTransaction(
        'patient-medication-channel',
        'mychaincode',
        'registerDoctor',
        [username, gender, specialisation, orgName],
        username,
        orgName,
        null
      );
    }
    response.token = token;
    res.json(response);
  } else {
    res.json({ success: false, message: response });
  }
});
// Patient check-in (Registration channel). Expects: { patientID, doctorID, patientInfo, status, peers }
app.post('/patientCheckIn', async (req, res) => {
  const { patientID, doctorID, patientInfo, status, peers } = req.body;
  if (!patientID || !doctorID || !patientInfo || !status) {
    return res.json(getErrorMessage('patientID, doctorID, patientInfo, and status'));
  }
  try {
    const start = Date.now();
    const message = await invoke.invokeTransaction(
      "patient-medication-channel",
      "mychaincode",
      "patientCheckIn",
      [patientID, doctorID, JSON.stringify(patientInfo), status],
      req.username,
      req.orgname,
      null
    );
    res.json({ result: message, latency: Date.now() - start });
  } catch (error) {
    res.json({ result: null, error: error.name, errorData: error.message });
  }
});

// Check-out (Registration channel). Expects: { patientID, doctorID, patientInfo, status, peers }
app.post('/checkOut', async (req, res) => {
  const { patientID, doctorID, patientInfo, status, peers } = req.body;
  if (!patientID || !doctorID || !patientInfo || !status) {
    return res.json(getErrorMessage('patientID, doctorID, patientInfo, and status'));
  }
  try {
    const message = await invoke.invokeTransaction(
      "patient-medication-channel",
      "mychaincode",
      "checkOut",
      [patientID, doctorID, JSON.stringify(patientInfo), status],
      req.username,
      req.orgname,
      null
    );
    res.json({ result: message });
  } catch (error) {
    res.json({ result: null, error: error.name, errorData: error.message });
  }
});

/*
  ============= Patient-Medication Channel Endpoints =============
*/

// Create Medical Record (doctor only).
// Expects: { patientID, doctorID, symptoms, diagnosis, notes, peers, doctorPrivateKey, patientPublicKey }
app.post('/createMedicalRecord', async (req, res) => {
  const {
    patientID,
    doctorID,
    symptoms,
    diagnosis,
    notes,
    peers,
    doctorEncryptionPrivateKey,  // X25519 private key (Base64)
    doctorEncryptionPublicKey,    // X25519 public  key (Base64)
    patientEncryptionPublicKey   // X25519 public  key (Base64)
  } = req.body;

  // 1) Validate inputs
  if (
    !patientID || !doctorID || !symptoms || !diagnosis || !notes ||
    !doctorEncryptionPrivateKey || !doctorEncryptionPublicKey || !patientEncryptionPublicKey
  ) {
    return res.status(400).json(
      getErrorMessage(
        'patientID, doctorID, symptoms, diagnosis, notes, doctorEncryptionPrivateKey, doctorEncryptionPublicKey, and patientEncryptionPublicKey'
      )
    );
  }

  try {
    // 2) Derive shared secret
    const docPrivKey = mcc.decodeKey(doctorEncryptionPrivateKey);
    const patPubKey  = mcc.decodeKey(patientEncryptionPublicKey);
    const sharedSecret = mcc.generateSharedSecret(docPrivKey, patPubKey);

    // 3) Encrypt the record
    const record = { patientID, doctorID, symptoms, diagnosis, notes };
    const { ciphertext, nonce } = mcc.encryptData(JSON.stringify(record), sharedSecret);

    // 4) Package payload (use public key for sender)
    const payload = {
      ciphertext,
      nonce,
      senderPublicKey: doctorEncryptionPublicKey
    };

    // 5) Submit to ledger
    const txResponse = await invoke.invokeTransaction(
      'patient-medication-channel',
      'mychaincode',
      'createMedicalRecord',
      [patientID, doctorID, JSON.stringify(payload)],
      req.username,
      req.orgname,
      null
    );

    return res.json({ success: true, result: txResponse });

  } catch (error) {
    console.error('createMedicalRecord error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});


// Get Medical Record (secured by MCC). Query parameters: { recordID, receiverID, mccAuthToken, peer, patientPrivateKey, doctorPublicKey }

//________________________________________________________________________

// app.post('/getMedicalRecord', async (req, res) => {
//   try {
//     // 1) Destructure the body—you expect mccAuthToken as an object, not a string
//     const {
//       recordID,
//       receiverID,
//       mccAuthToken,      // { publicKey, signature }
//       patientPrivateKey, // Base64 “8en6sy…=”
//       doctorPublicKey    // Base64 “r+HLNk…=”
//     } = req.body;

//     // 2) Validate presence
//     if (
//       !recordID ||
//       !receiverID ||
//       !mccAuthToken ||
//       !mccAuthToken.publicKey ||
//       !mccAuthToken.signature ||
//       !patientPrivateKey ||
//       !doctorPublicKey
//     ) {
//       return res
//         .status(400)
//         .json({ success: false, message: 'Missing one of recordID, receiverID, mccAuthToken.publicKey, mccAuthToken.signature, patientPrivateKey, or doctorPublicKey' });
//     }

//     // —— DEBUG: log exactly what arrived —— 
//     console.log('getMedicalRecord payload:', {
//       recordID,
//       receiverID,
//       mccAuthToken,
//       patientPrivateKey,
//       doctorPublicKey
//     });

//     // 3) Verify the MCC signature
//     const { publicKey: requesterPublicKey, signature } = mccAuthToken;
//     const challenge = `access_medical_record:${recordID}`;
//     console.log('  Verifying MCC signature:');
//     console.log('   challenge:', challenge);
//     console.log('   publicKey (len):', requesterPublicKey.length, requesterPublicKey);
//     console.log('   signature (len):', signature.length, signature);
//     if (!mcc.verifySignature(requesterPublicKey, challenge, signature)) {
//       return res
//         .status(403)
//         .json({ success: false, message: 'Invalid MCC signature' });
//     }

//     // 4) Invoke chaincode to fetch the encrypted record
//     const chainResp = await invoke.invokeTransaction(
//       'patient-medication-channel',
//       'mychaincode',
//       'getMedicalRecord',
//       [
//         recordID,
//         receiverID,
//         // we stringify the object so chaincode sees JSON
//         JSON.stringify(mccAuthToken)
//       ],
//       req.username,  // from your JWT middleware
//       req.orgname,   // from your JWT middleware
//       null
//     );

//     // 5) Make sure you end up with an object
//     const record = typeof chainResp === 'string'
//       ? JSON.parse(chainResp)
//       : chainResp;

//     // 6) Decrypt it
//     const sharedSecret = mcc.generateSharedSecret(
//       mcc.decodeKey(patientPrivateKey),
//       mcc.decodeKey(doctorPublicKey)
//     );
//     const plaintext = mcc.decryptData(
//       record.encrypted.ciphertext,
//       record.encrypted.nonce,
//       sharedSecret
//     );

//     // 7) Parse and return
//     return res.json({
//       success: true,
//       result: JSON.parse(plaintext)
//     });

//   } catch (err) {
//     console.error('getMedicalRecord error:', err);
//     return res
//       .status(500)
//       .json({ success: false, message: err.message });
//   }
// });

// … after app.use(bearerToken()) + your JWT middleware …

app.post('/getMedicalRecord', async (req, res) => {
  try {
    const {
      recordID,
      receiverID,
      mccAuthToken,                // { publicKey, signature }
      patientEncryptionPrivateKey, // X25519 private key (Base64)
      doctorEncryptionPublicKey    // X25519 public key  (Base64)
    } = req.body;

    // 1) Validate inputs
    if (
      !recordID || !receiverID || !mccAuthToken ||
      !patientEncryptionPrivateKey || !doctorEncryptionPublicKey
    ) {
      return res.status(400).json({
        success: false,
        message: 'Missing one of: recordID, receiverID, mccAuthToken, patientEncryptionPrivateKey, or doctorEncryptionPublicKey'
      });
    }

    // 2) Verify MCC signature (Ed25519)
    const { publicKey: requesterSigningPub, signature } = mccAuthToken;
    const challenge = `access_medical_record:${recordID}`;
    if (!mcc.verifySignature(requesterSigningPub, challenge, signature)) {
      return res.status(403).json({ success: false, message: 'Invalid MCC signature' });
    }

    // 3) Fetch the encrypted record from chaincode
    const txResponse = await invoke.invokeTransaction(
      'patient-medication-channel',
      'mychaincode',
      'getMedicalRecord',
      [recordID, receiverID, JSON.stringify(mccAuthToken)],
      req.username,
      req.orgname,
      null
    );

    // txResponse has { message, result }
    const payload = txResponse.result;
    const record = typeof payload === 'string' ? JSON.parse(payload) : payload;

    if (!record.encrypted) {
      return res.status(500).json({ success: false, message: 'Malformed record: missing encrypted field' });
    }

    // 4) Derive shared secret and decrypt
    const sharedSecret = mcc.generateSharedSecret(
      mcc.decodeKey(patientEncryptionPrivateKey),
      mcc.decodeKey(doctorEncryptionPublicKey)
    );
    const plaintext = mcc.decryptData(
      record.encrypted.ciphertext,
      record.encrypted.nonce,
      sharedSecret
    );

    // 5) Return the clear record
    return res.json({ success: true, result: JSON.parse(plaintext) });

  } catch (err) {
    console.error('getMedicalRecord error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});


// Create Prescription (doctor only).
// Expects: { patientID, doctorID, medications (JSON string), billAmount, peers, doctorPrivateKey, pharmacistPublicKey }
app.post('/createPrescription', async (req, res) => {
  const {
    patientID,
    doctorID,
    medications,
    billAmount,
    peers,
    doctorEncryptionPrivateKey,  // X25519 private key (Base64)
    doctorEncryptionPublicKey,
    pharmacistEncryptionPublicKey // X25519 public  key (Base64)
  } = req.body;

  // 1) Validate inputs
  if (
    !patientID || !doctorID ||
    !medications || billAmount == null ||
    !doctorEncryptionPrivateKey || !doctorEncryptionPublicKey ||
    !pharmacistEncryptionPublicKey
  ) {
    return res.status(400).json(getErrorMessage(
      'patientID, doctorID, medications, billAmount, doctorEncryptionPrivateKey, doctorEncryptionPublicKey and pharmacistEncryptionPublicKey'
    ));
  }

  try {
    // 2) Derive shared secret (doctor ↔ pharmacist)
    const sharedSecret = mcc.generateSharedSecret(
      mcc.decodeKey(doctorEncryptionPrivateKey),
      mcc.decodeKey(pharmacistEncryptionPublicKey)
    );

    // 3) Encrypt
    const prescriptionData = { medications, billAmount };
    const { ciphertext, nonce } = mcc.encryptData(JSON.stringify(prescriptionData), sharedSecret);

    // 4) Package payload (use public key for sender)
    const payload = {
      ciphertext,
      nonce,
      senderPublicKey: doctorEncryptionPublicKey
    };

    const txResponse = await invoke.invokeTransaction(
      'patient-medication-channel',
      'mychaincode',
      'createPrescription',
      [patientID, doctorID, JSON.stringify(payload)],
      req.username,
      req.orgname,
      peers || null
    );

    // 5) Return chaincode result
    return res.json({ success: true, result: txResponse.result });

  } catch (err) {
    console.error('createPrescription error:', err);
    return res.status(500).json({
      success: false,
      error: err.name,
      errorData: err.message
    });
  }
});


// Get Prescription (secured with MCC). Query parameters: { prescriptionID, receiverID, mccAuthToken, peer, pharmacistPrivateKey, doctorPublicKey }
app.post('/getPrescription', async (req, res) => {
  const {
    prescriptionID,
    receiverID,
    mccAuthToken,                  // { publicKey, signature }
    pharmacistEncryptionPrivateKey, // X25519 private key (Base64)
    doctorEncryptionPublicKey       // X25519 public  key (Base64)
  } = req.body;

  // 1) Validate
  if (
    !prescriptionID || !receiverID ||
    !mccAuthToken ||
    !pharmacistEncryptionPrivateKey ||
    !doctorEncryptionPublicKey
  ) {
    return res.status(400).json({
      success: false,
      message: 'Missing one of: prescriptionID, receiverID, mccAuthToken, pharmacistEncryptionPrivateKey, or doctorEncryptionPublicKey'
    });
  }

  try {
    // 2) Verify MCC signature (Ed25519)
    const { publicKey: signerPub, signature } = mccAuthToken;
    const challenge = `access_prescription:${prescriptionID}`;
    if (!mcc.verifySignature(signerPub, challenge, signature)) {
      return res.status(403).json({ success: false, message: 'Invalid MCC signature' });
    }

    // 3) Fetch encrypted payload
    const txResponse = await invoke.invokeTransaction(
      'patient-medication-channel',
      'mychaincode',
      'getPrescription',
      [prescriptionID, receiverID, JSON.stringify(mccAuthToken)],
      req.username,
      req.orgname,
      null
    );

    const payload = txResponse.result;
    const prescription = typeof payload === 'string' ? JSON.parse(payload) : payload;
    if (!prescription.encrypted) {
      return res.status(500).json({ success: false, message: 'Malformed record: missing encrypted field' });
    }
    // 4) Decrypt
    const sharedSecret = mcc.generateSharedSecret(
      mcc.decodeKey(pharmacistEncryptionPrivateKey),
      mcc.decodeKey(doctorEncryptionPublicKey)
    );
    const plaintext = mcc.decryptData(prescription.encrypted.ciphertext, prescription.encrypted.nonce, sharedSecret);

    // 5) Return
    return res.json({ success: true, result: JSON.parse(plaintext) });

  } catch (err) {
    console.error('getPrescription error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/dispenseMedication', async (req, res) => {
  const {
    prescriptionID,
    pharmacistID,
    status,
    billAmount,
    peers,
    pharmacistEncryptionPrivateKey,  // X25519 priv key (Base64)
    doctorEncryptionPublicKey,       // X25519 pub  key (Base64)
    mccAuthToken                     // { publicKey, signature }
  } = req.body;

  // 1) Quick dump so we can see what's actually arriving
  console.log('dispenseMedication payload:', {
    prescriptionID,
    pharmacistID,
    status,
    billAmount,
    peers,
    pharmacistEncryptionPrivateKey,
    doctorEncryptionPublicKey,
    mccAuthToken
  });

  // 2) Validate all required fields
  const missing = [];
  if (!prescriptionID)                  missing.push('prescriptionID');
  if (!pharmacistID)                    missing.push('pharmacistID');
  if (status == null)                   missing.push('status');
  if (billAmount == null)               missing.push('billAmount');
  if (!pharmacistEncryptionPrivateKey)  missing.push('pharmacistEncryptionPrivateKey');
  if (!doctorEncryptionPublicKey)       missing.push('doctorEncryptionPublicKey');
  if (!mccAuthToken)                    missing.push('mccAuthToken');

  if (missing.length) {
    return res.status(400).json({
      success: false,
      message: 'Missing parameters: ' + missing.join(', ')
    });
  }

  try {
    // 3) Verify MCC auth token
    const { publicKey: signerPub, signature } = mccAuthToken;
    const challenge = `access_prescription:${prescriptionID}`;
    if (!mcc.verifySignature(signerPub, challenge, signature)) {
      return res.status(403).json({ success: false, message: 'Invalid MCC signature' });
    }

    // 4) Fetch encrypted prescription
    const txQuery = await invoke.invokeTransaction(
      'patient-medication-channel',
      'mychaincode',
      'getPrescription',
      [prescriptionID, pharmacistID, JSON.stringify(mccAuthToken)],
      req.username,
      req.orgname,
      peers || null
    );
    const encrypted = typeof txQuery.result === 'string'
      ? JSON.parse(txQuery.result)
      : txQuery.result;

    // 5) Double-check keys before decode
    console.log('Decoding keys lengths:', {
      pharmPrivLen: pharmacistEncryptionPrivateKey.length,
      docPubLen: doctorEncryptionPublicKey.length
    });

    // 6) Derive shared secret & decrypt
    const sharedSecret = mcc.generateSharedSecret(
      mcc.decodeKey(pharmacistEncryptionPrivateKey),
      mcc.decodeKey(doctorEncryptionPublicKey)
    );
    const plaintext = mcc.decryptData(
      encrypted.ciphertext,
      encrypted.nonce,
      sharedSecret
    );
    const prescription = JSON.parse(plaintext);

    // 7) Update and re‑encrypt
    prescription.status       = status;
    prescription.billAmount   = parseFloat(billAmount);
    prescription.pharmacistID = pharmacistID;
    prescription.dispensedAt  = new Date().toISOString();

    const updated = mcc.encryptData(JSON.stringify(prescription), sharedSecret);

    // 8) Write back
    const txDispense = await invoke.invokeTransaction(
      'patient-medication-channel',
      'mychaincode',
      'dispenseMedication',
      [prescriptionID, JSON.stringify(updated)],
      req.username,
      req.orgname,
      peers || null
    );

    return res.json({
      success: true,
      prescription,
      result: txDispense.result
    });

  } catch (err) {
    console.error('dispenseMedication error:', err);
    return res.status(500).json({
      success: false,
      error: err.name,
      errorData: err.message
    });
  }
});


// ----- Billing Channel Endpoint ----- //

// Billing (called by receptionist). Expects: { patientID, billAmount, status ("Paid"), peers }
app.post('/billing', async (req, res) => {
  const { patientID, billAmount, status, peers } = req.body;
  if (!patientID || !billAmount || !status) {
    return res.json(getErrorMessage('patientID, billAmount, and status'));
  }
  try {
    const message = await invoke.invokeTransaction(
      "patient-medical-channel",
      "mychaincode",
      "billing",
      [patientID, billAmount, status],
      req.username,
      req.orgname,
      null
    );
    res.json({ result: message });
  } catch (error) {
    res.json({ result: null, error: error.name, errorData: error.message });
  }
});

// ----- Communication Channel Endpoints ----- //

// Send Message (all roles allowed). Expects: { senderID, recipientID, message, peers }
app.post('/sendMessage', async (req, res) => {
  const { senderID, recipientID, message, peers } = req.body;
  if (!senderID || !recipientID || !message) {
    return res.status(400).json(getErrorMessage('senderID, recipientID, and message'));
  }
  try {
    const txResponse = await invoke.invokeTransaction(
      "patient-medication-channel",
      "mychaincode",
      "sendMessage",
      [senderID, recipientID, message],
      req.username,
      req.orgname,
      peers || null
    );
    return res.json({ success: true, result: txResponse.result });
  } catch (error) {
    console.error('sendMessage error:', error);
    return res.status(500).json({ success: false, error: error.name, errorData: error.message });
  }
});


// Get Messages (only sender can retrieve). Query: { senderID, peer }
// Fetch all messages sent by a user
app.post('/getMessages', async (req, res) => {
  const {
    recipientID,
    peers    // optional array of endorsing peers
  } = req.body;

  // 1) Validate
  if (!recipientID) {
    return res.status(400).json({
      success: false,
      message: 'Missing required parameter: senderID'
    });
  }

  try {
    // 2) Invoke chaincode
    const txResponse = await invoke.invokeTransaction(
      'patient-medication-channel',
      'mychaincode',
      'getMessages',
      [recipientID],
      req.username,
      req.orgname,
      peers || null
    );

    // 3) Return the result
    return res.json({
      success: true,
      messages: txResponse.result
    });

  } catch (error) {
    console.error('getMessages error:', error);
    return res.status(500).json({
      success: false,
      error: error.name,
      errorData: error.message
    });
  }
});


// ----- Query Endpoint ----- //

// Query Patients by Doctor. Query: { doctorID, peer }
app.get('/queryPatientsByDoctor', async (req, res) => {
  const { doctorID, peer } = req.query;
  if (!doctorID) {
    return res.json(getErrorMessage('doctorID'));
  }
  try {
    const result = await invoke.invokeTransaction(
      "patient-medication-channel",
      "mychaincode",
      "queryPatientsByDoctor",
      [doctorID],
      req.username,
      req.orgname,
      null
    );
    res.json({ result });
  } catch (error) {
    res.json({ result: null, error: error.name, errorData: error.message });
  } 
});

// ----- QSCC Query Endpoint ----- //
app.get('/qscc/channels/:channelName/chaincodes/:chaincodeName', async (req, res) => {
  try {
    logger.debug('==================== QUERY QSCC ==================');
    const channelName = req.params.channelName;
    const chaincodeName = req.params.chaincodeName;
    let args = req.query.args;
    const fcn = req.query.fcn;
    if (!chaincodeName) {
      res.json(getErrorMessage('\'chaincodeName\''));
      return;
    }
    if (!channelName) {
      res.json(getErrorMessage('\'channelName\''));
      return;
    }
    if (!fcn) {
      res.json(getErrorMessage('\'fcn\''));
      return;
    }
    if (!args) {
      res.json(getErrorMessage('\'args\''));
      return;
    }
    args = args.replace(/'/g, '"');
    args = JSON.parse(args);
    let response_payload = await qscc.qscc(channelName, chaincodeName, args, fcn, req.username, req.orgname);
    res.send(response_payload);
  } catch (error) {
    const response_payload = {
      result: null,
      error: error.name,
      errorData: error.message
    }
    res.send(response_payload);
  }
});


// in app.js (or wherever you mount your routes)

// Helper to build a gateway+contract for a given org
async function getContractForOrg(orgName) {
  const ccp = await helper.getCCP(orgName);
  const wallet = await Wallets.newFileSystemWallet(await helper.getWalletPath(orgName));
  const gateway = new Gateway();
  await gateway.connect(ccp, {
    wallet,
    identity: "receptionist",
    discovery: { enabled: true, asLocalhost: true }
  });
  const network = await gateway.getNetwork('registration-channel');
  return network.getContract('mychaincode');
}

// 1a) Query a single user
app.get('/users/:username', async (req, res) => {
  try {
    const contract = await getContractForOrg(req.query.orgName);
    const result = await contract.evaluateTransaction('queryUser', req.params.username);
    res.json(JSON.parse(result.toString()));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 1b) Query all users
app.get('/users', async (req, res) => {
  try {
    const contract = await getContractForOrg(req.query.orgName);
    const result = await contract.evaluateTransaction('queryAllUsers');
    res.json(JSON.parse(result.toString()));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


module.exports = app;
