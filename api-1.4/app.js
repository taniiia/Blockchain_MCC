'use strict';

const log4js = require('log4js');
const logger = log4js.getLogger('MyApp');
logger.setLevel('DEBUG');

const express = require('express');
const bodyParser = require('body-parser');
const http = require('http');
const util = require('util');
const expressJWT = require('express-jwt');
const jwt = require('jsonwebtoken');
const bearerToken = require('express-bearer-token');
const cors = require('cors');

const config = require('./config.js');
const hfc = require('fabric-client');

const helper = require('./app/helper.js');
const invoke = require('./app/invokeChaincode.js');
const mcc = require('./app/mcc.js');  

const app = express();
app.options('*', cors());
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.set('secret', 'thisismysecret');
app.use(expressJWT({ secret: 'thisismysecret' }).unless({ path: ['/users'] }));
app.use(bearerToken());
app.use((req, res, next) => {
  logger.debug('New request for %s', req.originalUrl);
  if (req.originalUrl.includes('/users')) {
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
      next();
    }
  });
});

// Start the Server
const host = process.env.HOST || config.host;
const port = process.env.PORT || config.port;
const server = http.createServer(app).listen(port, () => {
  logger.info('SERVER STARTED at http://%s:%s', host, port);
});
server.timeout = 240000;

// Helper function for error messages
function getErrorMessage(field) {
  return { success: false, message: `${field} field is missing or invalid in the request` };
}

// ----- Registration Channel Endpoints ----- //

// Register pharmacists / receptionists. Expects: { name, organization, role }
app.post('/users', async (req, res) => {
  const { name, organization, role } = req.body;
  if (!name || !organization || !role) {
    return res.json(getErrorMessage('name, organization, and role'));
  }

  const token = jwt.sign({
    exp: Math.floor(Date.now() / 1000) + parseInt(hfc.getConfigSetting('jwt_expiretime')),
    username: name,
    orgName: organization,
    role
  }, app.get('secret'));

  const response = await helper.getRegisteredUser(name, organization, role, true);
  if (response && typeof response !== 'string') {
    response.token = token;
    res.json(response);
  } else {
    res.json({ success: false, message: response });
  }
});



// Register patient. Expects: { name, age, organization, gender }
app.post('/registerPatient', async (req, res) => {
  const { name, age, organization, gender } = req.body;
  if (!name || !age || !organization || !gender) {
    return res.json(getErrorMessage('name, age, organization, gender'));
  }

  const token = jwt.sign({
    exp: Math.floor(Date.now() / 1000) + parseInt(hfc.getConfigSetting('jwt_expiretime')),
    username: name,
    orgName: organization,
    role: 'patient',
    age,
    gender
  }, app.get('secret'));

  const response = await helper.getRegisteredPatient(name, organization, 'patient', age, gender, true);

  if (response && typeof response !== 'string') {
    // Now save to ledger
    await invoke.invokeChaincode(
      peers,
      "registration-channel",
      "mychaincode",
      "registerPatient",
      [name, age.toString(), organization, gender],
      name,
      organization
    );

    response.token = token;
    res.json(response);
  } else {
    res.json({ success: false, message: response });
  }
});


// Register doctor. Expects: { name, gender, specialisation, organization }
app.post('/registerDoctor', async (req, res) => {
  const { name, gender, specialisation, organization } = req.body;
  if (!name || !gender || !specialisation || !organization) {
    return res.json(getErrorMessage('name, gender, specialisation, organization'));
  }

  const token = jwt.sign({
    exp: Math.floor(Date.now() / 1000) + parseInt(hfc.getConfigSetting('jwt_expiretime')),
    username: name,
    orgName: organization,
    role: 'doctor',
    gender,
    specialisation
  }, app.get('secret'));

  const response = await helper.getRegisteredDoctor(name, organization, 'doctor', gender, specialisation, true);

  if (response && typeof response !== 'string') {
    // Store doctor in ledger
    await invoke.invokeChaincode(
      peers,
      "registration-channel",
      "mychaincode",
      "registerDoctor",
      [name, gender, specialisation, organization],
      name,
      organization
    );

    response.token = token;
    res.json(response);
  } else {
    res.json({ success: false, message: response });
  }
});


// Patient check-in (Registration channel): Expects: { patientID, doctorID, patientInfo, status }
app.post('/patientCheckIn', async (req, res) => {
  const { patientID, doctorID, patientInfo, status, peers } = req.body;
  if (!patientID || !doctorID || !patientInfo || !status) {
    return res.json(getErrorMessage('patientID, doctorID, patientInfo, status'));
  }
  try {
    const start = Date.now();
    const message = await invoke.invokeChaincode(
      peers,
      "registration-channel",
      "mychaincode",
      "patientCheckIn",
      [patientID, doctorID, JSON.stringify(patientInfo), status],
      req.username,
      req.orgname
    );
    res.json({ result: message, latency: Date.now() - start });
  } catch (error) {
    res.json({ result: null, error: error.name, errorData: error.message });
  }
});

// Check-out (Registration channel): { patientID, doctorID, patientInfo, status }
app.post('/checkOut', async (req, res) => {
  const { patientID, doctorID, patientInfo, status, peers } = req.body;
  if (!patientID || !doctorID || !patientInfo || !status) {
    return res.json(getErrorMessage('patientID, doctorID, patientInfo, status'));
  }
  try {
    const message = await invoke.invokeChaincode(
      peers,
      "registration-channel",
      "mychaincode",
      "checkOut",
      [patientID, doctorID, JSON.stringify(patientInfo), status],
      req.username,
      req.orgname
    );
    res.json({ result: message });
  } catch (error) {
    res.json({ result: null, error: error.name, errorData: error.message });
  }
});

// ----- Patient-Medication Channel Endpoints ----- //

// Create Medical Record (doctor only). Expects: { patientID, doctorID, symptoms, diagnosis, notes }
app.post('/createMedicalRecord', async (req, res) => {

  const { patientID, doctorID, symptoms, diagnosis, notes, peers, doctorPrivateKey, patientPublicKey } = req.body;
  
  if (!patientID || !doctorID || !symptoms || !diagnosis || !notes || !doctorPrivateKey || !patientPublicKey) {
    return res.json(getErrorMessage('patientID, doctorID, symptoms, diagnosis, notes, doctorPrivateKey, and patientPublicKey'));
  }
  
  try {
    const mcc = require('./app/mcc.js');
    
    // Decode the provided keys from Base64 to Uint8Array.
    const docPrivKey = mcc.decodeKey(doctorPrivateKey);
    const patPubKey = mcc.decodeKey(patientPublicKey);
    
    // Generate a shared secret using doctor's private key and patient's public key.
    const sharedSecret = mcc.generateSharedSecret(docPrivKey, patPubKey);
    
    // Create a record object including a timestamp.
    const record = {
      patientID: patientID,
      doctorID: doctorID,
      symptoms: symptoms,
      diagnosis: diagnosis,
      notes: notes
    };
    
    // Encrypt the record using the shared secret.
    const encrypted = mcc.encryptData(JSON.stringify(record), sharedSecret);
    
    
    const payload = {
      ciphertext: encrypted.ciphertext,
      nonce: encrypted.nonce,
      senderPublicKey: patientPublicKey  
    };
    
    const message = await invoke.invokeChaincode(
      peers,
      "patient-medication-channel",
      "mychaincode",
      "createMedicalRecord",
      [patientID, doctorID, JSON.stringify(payload)],
      req.username,
      req.orgname
    );
    
    res.json({ result: message });
  } catch (error) {
    res.json({ result: null, error: error.name, errorData: error.message });
  }
});


// Get Medical Record (secured by MCC). Query parameters: recordID, receiverID, mccAuthToken, peer
app.get('/getMedicalRecord', async (req, res) => {
  const { recordID, receiverID, mccAuthToken, peer, patientPrivateKey, doctorPublicKey } = req.query;

  if (!recordID || !receiverID || !mccAuthToken || !patientPrivateKey || !doctorPublicKey) {
    return res.json({
      error: 'Missing recordID, receiverID, mccAuthToken, patientPrivateKey, or doctorPublicKey'
    });
  }

  try {
    const { signature, publicKey: requesterPublicKey } = JSON.parse(mccAuthToken);
    const mcc = require('./app/mcc.js');
    const challenge = `access_medical_record:${recordID}`;

    const isValid = mcc.verifySignature(
      mcc.decodeKey(requesterPublicKey),
      challenge,
      signature
    );
    if (!isValid) throw new Error('Invalid MCC signature');

    const response = await invoke.invokeChaincode(
      [peer],
      'patient-medication-channel',
      'mychaincode',
      'getMedicalRecord',
      [recordID, receiverID, mccAuthToken],
      req.username,
      req.orgname
    );

    const record = JSON.parse(response);

    // 🔐 Generate shared secret using patient's private key and doctor's public key
    const sharedSecret = mcc.generateSharedSecret(
      mcc.decodeKey(patientPrivateKey),   // Patient's private key
      mcc.decodeKey(doctorPublicKey)      // Doctor's public key
    );

    // 🔓 Decrypt the encrypted data using shared secret
    const plaintext = mcc.decryptData(
      record.encrypted.ciphertext,
      record.encrypted.nonce,
      sharedSecret
    );

    res.json({ result: JSON.parse(plaintext) });

  } catch (err) {
    res.json({ error: err.message });
  }
});



// app.post('/updateMedicalRecord', async (req, res) => {
//   const { recordID, newData, peer, receiverID, mccAuthToken } = req.body;
//   if (!recordID || !newData || !receiverID || !mccAuthToken) {
//     return res.json({ error: 'Missing required fields' });
//   }

//   try {
//     const { signature, publicKey } = JSON.parse(mccAuthToken);
//     const mcc = require('./app/mcc.js');
//     const challenge = `update_medical_record:${recordID}`;

//     const isValid = mcc.verifySignature(mcc.decodeKey(publicKey), challenge, signature);
//     if (!isValid) throw new Error('Invalid MCC signature');

//     const sharedSecret = mcc.generateSharedSecret(
//       req.userPrivateKey,
//       mcc.decodeKey(publicKey)
//     );
//     const encrypted = mcc.encryptData(JSON.stringify(newData), sharedSecret);

//     const response = await invoke.invokeChaincode(
//       [peer],
//       'patient-medication-channel',
//       'mychaincode',
//       'updateMedicalRecord',
//       [recordID, receiverID, mccAuthToken, JSON.stringify(encrypted)],
//       req.username,
//       req.orgname
//     );
//     res.json({ result: response });
//   } catch (err) {
//     res.json({ error: err.message });
//   }
// });


// Create Prescription (doctor only). Expects: { patientID, doctorID, medications (JSON string), billAmount }
app.post('/createPrescription', async (req, res) => {
  const { patientID, doctorID, medications, billAmount, peers, doctorPrivateKey, pharmacistPublicKey } = req.body;

  if (!patientID || !doctorID || !medications || !billAmount || !doctorPrivateKey || !pharmacistPublicKey) {
    return res.json(getErrorMessage('patientID, doctorID, medications, billAmount, doctorPrivateKey, and pharmacistPublicKey'));
  }

  try {
    const mcc = require('./app/mcc.js');

    // Construct the prescription data object
    const prescriptionData = {
      medications,
      billAmount
    };

    // Generate shared secret using doctor's private key and pharmacist's public key
    const sharedSecret = mcc.generateSharedSecret(
      mcc.decodeKey(doctorPrivateKey),
      mcc.decodeKey(pharmacistPublicKey)
    );

    // Encrypt the prescription data
    const encrypted = mcc.encryptData(JSON.stringify(prescriptionData), sharedSecret);

    // Send encrypted data to the blockchain
    const message = await invoke.invokeChaincode(
      peers,
      "patient-medication-channel",
      "mychaincode",
      "createPrescription",
      [patientID, doctorID, JSON.stringify(encrypted)],
      req.username,
      req.orgname
    );

    res.json({ result: message });
  } catch (error) {
    res.json({ result: null, error: error.name, errorData: error.message });
  }
});


// Get Prescription (secured with MCC). Query: { prescriptionID, receiverID, mccAuthToken, peer }
app.get('/getPrescription', async (req, res) => {
  const { prescriptionID, receiverID, mccAuthToken, peer, pharmacistPrivateKey, doctorPublicKey } = req.query;

  if (!prescriptionID || !receiverID || !mccAuthToken || !pharmacistPrivateKey || !doctorPublicKey) {
    return res.json({ error: 'Missing required params: prescriptionID, receiverID, mccAuthToken, pharmacistPrivateKey, or doctorPublicKey' });
  }

  try {
    const mcc = require('./app/mcc.js');
    const { signature, publicKey } = JSON.parse(mccAuthToken);
    const challenge = `access_prescription:${prescriptionID}`;

    const isValid = mcc.verifySignature(mcc.decodeKey(publicKey), challenge, signature);
    if (!isValid) throw new Error('Invalid MCC signature');

    // Fetch the encrypted prescription from the chaincode
    const response = await invoke.invokeChaincode(
      [peer],
      'patient-medication-channel',
      'mychaincode',
      'getPrescription',
      [prescriptionID, receiverID, mccAuthToken],
      req.username,
      req.orgname
    );

    const encrypted = JSON.parse(response);

    // Generate shared secret using pharmacist's private key and doctor's public key
    const sharedSecret = mcc.generateSharedSecret(
      mcc.decodeKey(pharmacistPrivateKey),
      mcc.decodeKey(doctorPublicKey)
    );

    // Decrypt the data
    const plaintext = mcc.decryptData(
      encrypted.ciphertext,
      encrypted.nonce,
      sharedSecret
    );

    res.json({ result: JSON.parse(plaintext) });
  } catch (err) {
    res.json({ error: err.message });
  }
});


// Update Prescription (doctor only with MCC). Expects: { prescriptionID, doctorID, field, newValue, mccAuthToken }
// app.post('/updatePrescription', async (req, res) => {
//   const { prescriptionID, newData, receiverID, mccAuthToken, peer } = req.body;
//   if (!prescriptionID || !newData || !receiverID || !mccAuthToken) {
//     return res.json({ error: 'Missing fields' });
//   }

//   try {
//     const { signature, publicKey } = JSON.parse(mccAuthToken);
//     const mcc = require('./app/mcc.js');
//     const challenge = `update_prescription:${prescriptionID}`;
//     const isValid = mcc.verifySignature(mcc.decodeKey(publicKey), challenge, signature);
//     if (!isValid) throw new Error('Invalid MCC token');

//     const sharedSecret = mcc.generateSharedSecret(req.userPrivateKey, mcc.decodeKey(publicKey));
//     const encrypted = mcc.encryptData(JSON.stringify(newData), sharedSecret);

//     const response = await invoke.invokeChaincode(
//       [peer],
//       'patient-medication-channel',
//       'mychaincode',
//       'updatePrescription',
//       [prescriptionID, receiverID, mccAuthToken, JSON.stringify(encrypted)],
//       req.username,
//       req.orgname
//     );
//     res.json({ result: response });
//   } catch (err) {
//     res.json({ error: err.message });
//   }
// });


// Dispense Medication (pharmacist only). Expects: { prescriptionID, pharmacistID, status ("Dispensed"), billAmount }
app.post('/dispenseMedication', async (req, res) => {
  const {
    prescriptionID,
    pharmacistID,
    status,
    billAmount,
    peers,
    pharmacistPrivateKey,
    doctorPublicKey,
    mccAuthToken,
    peer
  } = req.body;

  if (
    !prescriptionID ||
    !pharmacistID ||
    !status ||
    !billAmount ||
    !pharmacistPrivateKey ||
    !doctorPublicKey ||
    !mccAuthToken ||
    !peer
  ) {
    return res.json({
      error: 'Missing required params: prescriptionID, pharmacistID, status, billAmount, pharmacistPrivateKey, doctorPublicKey, mccAuthToken, and peer'
    });
  }

  try {
    // Load MCC
    const mcc = require('./app/mcc.js');

    // Step 1: Verify MCC auth token
    const { signature, publicKey } = JSON.parse(mccAuthToken);
    const challenge = `access_prescription:${prescriptionID}`;
    const isValid = mcc.verifySignature(
      mcc.decodeKey(publicKey),
      challenge,
      signature
    );

    if (!isValid) {
      return res.json({ error: 'Invalid MCC signature' });
    }

    // Step 2: Fetch the encrypted prescription from chaincode
    const response = await invoke.invokeChaincode(
      [peer],
      'patient-medication-channel',
      'mychaincode',
      'getPrescription',
      [prescriptionID, pharmacistID, mccAuthToken],
      req.username,
      req.orgname
    );

    const encrypted = JSON.parse(response);

    // Step 3: Generate shared secret
    const sharedSecret = mcc.generateSharedSecret(
      mcc.decodeKey(pharmacistPrivateKey),
      mcc.decodeKey(doctorPublicKey)
    );

    // Step 4: Decrypt prescription
    const decryptedJson = mcc.decryptData(
      encrypted.ciphertext,
      encrypted.nonce,
      sharedSecret
    );

    const prescription = JSON.parse(decryptedJson);

    // Step 5: Update the prescription fields
    prescription.Status = status;
    prescription.BillAmount = parseFloat(billAmount);
    prescription.PharmacistID = pharmacistID;
    prescription.DispensedAt = new Date().toISOString();

    // Step 6: Encrypt the updated prescription
    const updatedEncrypted = mcc.encryptData(
      JSON.stringify(prescription),
      sharedSecret
    );

    // Step 7: Send encrypted update to chaincode
    const message = await invoke.invokeChaincode(
      peers,
      'patient-medication-channel',
      'mychaincode',
      'dispenseMedication',
      [prescriptionID, pharmacistID, JSON.stringify(updatedEncrypted)],
      req.username,
      req.orgname
    );

    res.json({ result: message });

  } catch (error) {
    res.json({ error: error.message });
  }
});


// ----- Billing Channel Endpoint -----

// Billing (called by receptionist). Expects: { patientID, billAmount, status ("Paid") }
app.post('/billing', async (req, res) => {
  const { patientID, billAmount, status, peers } = req.body;
  if (!patientID || !billAmount || !status) {
    return res.json(getErrorMessage('patientID, billAmount, and status'));
  }
  try {
    const message = await invoke.invokeChaincode(
      peers,
      "billing-channel",
      "mychaincode",
      "billing",
      [patientID, billAmount, status],
      req.username,
      req.orgname
    );
    res.json({ result: message });
  } catch (error) {
    res.json({ result: null, error: error.name, errorData: error.message });
  }
});

// ----- Communication Channel Endpoints ----- //

// Send Message (all roles allowed). Expects: { senderID, recipientID, message }
app.post('/sendMessage', async (req, res) => {
  const { senderID, recipientID, message, peers } = req.body;
  if (!senderID || !recipientID || !message) {
    return res.json(getErrorMessage('senderID, recipientID, and message'));
  }
  try {
    const msg = await invoke.invokeChaincode(
      peers,
      "communication-channel",
      "mychaincode",
      "sendMessage",
      [senderID, recipientID, message],
      req.username,
      req.orgname
    );
    res.json({ result: msg });
  } catch (error) {
    res.json({ result: null, error: error.name, errorData: error.message });
  }
});

// Get Messages (only sender can retrieve). Query: { senderID, peer }
app.get('/getMessages', async (req, res) => {
  const { senderID, peer } = req.query;
  if (!senderID) {
    return res.json(getErrorMessage('senderID'));
  }
  try {
    const msg = await invoke.invokeChaincode(
      [peer],
      "communication-channel",
      "mychaincode",
      "getMessages",
      [senderID],
      req.username,
      req.orgname
    );
    res.json({ result: msg });
  } catch (error) {
    res.json({ result: null, error: error.name, errorData: error.message });
  }
});

// ----- Query Endpoint -----

// Query Patients by Doctor. Query: { doctorID, peer }
app.get('/queryPatientsByDoctor', async (req, res) => {
  const { doctorID, peer } = req.query;
  if (!doctorID) {
    return res.json(getErrorMessage('doctorID'));
  }
  try {
    const result = await invoke.invokeChaincode(
      [peer],
      "patient-medication-channel",
      "mychaincode",
      "queryPatientsByDoctor",
      [doctorID],
      req.username,
      req.orgname
    );
    res.json({ result });
  } catch (error) {
    res.json({ result: null, error: error.name, errorData: error.message });
  }
});

module.exports = app;
