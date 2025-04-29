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
const express = require('express');
const { expressjwt: expressJWT } = require('express-jwt');
const jwt = require('jsonwebtoken');
const bearerToken = require('express-bearer-token');
const cors = require('cors');
const fs        = require('fs');
const path      = require('path');
const bcrypt    = require('bcryptjs');
const cookieParser = require('cookie-parser');

const constants = require('./config/constants.json');
// const config = require('./config.js');

// API‑2.0 helper modules (fabric-network based)
const helper = require('./app/helper');
const invoke = require('./app/invoke');
const qscc = require('./app/qscc');
const query = require('./app/query');
const mcc = require('./app/mcc');

const app = express();

app.set('view engine', 'ejs');
app.set('views', __dirname + '/views'); // Set views folder

app.use(express.static('public'));

app.options('*', cors());
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


// Set the JWT secret for signing tokens.
app.set('secret', 'thisismysecret');

app.use(cookieParser());

// Protect all endpoints except registration and login.
app.use(expressJWT({
  secret: 'thisismysecret',
  algorithms: ['HS256'], // required in v7+
  getToken: req => req.cookies && req.cookies.token
}).unless({
  path: [
    '/register',
    '/users',
    '/users/login',
    '/register',
    '/registerPatient',
    '/registerDoctor',
    '/login'
  ]
}));

app.use(bearerToken());

// path to our simple JSON user store
const USERS_FILE = path.join(__dirname, 'data', 'users.json');

// helper to read/write our simple store
function readUsers() {
  if (!fs.existsSync(USERS_FILE)) return {};
  return JSON.parse(fs.readFileSync(USERS_FILE));
}
 
function writeUsers(data) {
  const dir = path.dirname(USERS_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(USERS_FILE, JSON.stringify(data, null, 2));
}

// app.use((req, res, next) => {
//   logger.debug('New request for %s', req.originalUrl);
//   // Allow unprotected paths.
//   if (req.originalUrl.includes('/users') ||
//       req.originalUrl.includes('/users/login') ||
//       req.originalUrl.includes('/register') ||
//       req.originalUrl.includes('/registerPatient') ||
//       req.originalUrl.includes('/registerDoctor')) {
//     return next();
//   }
//   const token = req.token;
//   jwt.verify(token, app.get('secret'), (err, decoded) => {
//     if (err) {
//       return res.status(403).json({
//         success: false,
//         message: 'Failed to authenticate token. Include token from /users as Bearer.'
//       });
//     } else {
//       req.username = decoded.username;
//       req.orgname = decoded.orgName;
//       logger.debug(util.format('Decoded JWT: username - %s, orgName - %s', decoded.username, decoded.orgName));
//       return next();
//     }
//   });
// });

// ——— AUTHENTICATION MIDDLEWARE ———
app.use((req, res, next) => {
  logger.debug('New request for %s', req.originalUrl);
  const openPaths = [
    '/register', '/login',
    '/users', '/users/login',
    '/registerPatient', '/registerDoctor'
  ];
  if (openPaths.some(p => req.originalUrl.startsWith(p))) {
    return next();
  }
  // read JWT from cookie (or fallback to Authorization header)
  const token = req.cookies.token || req.token;
  if (!token) {
    return res.redirect('/login');
  }
  jwt.verify(token, app.get('secret'), (err, decoded) => {
    if (err) {
      res.clearCookie('token');
      return res.redirect('/login');
    }
    // attach user info
    req.username = decoded.username;
    req.orgName  = decoded.orgName;
    req.role     = decoded.role;
    logger.debug(`Authenticated: ${req.username}@${req.orgName} as ${req.role}`);
    next();
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
app.get('/register', (req, res) => {
  res.render('register', { error: null });
});

app.post('/users', async (req, res) => {
  const { username, orgName, role, password } = req.body;
  if (!username || !orgName || !role || !password) {
    return res.status(400).render('register', {
      error: 'All fields are required'
    });
  }

  const users = readUsers();
  const key   = `${username}@${orgName}`;
  if (users[key]) {
    // Rather than return JSON, re-render the form with an error
    return res.status(409).render('register', {
      error: 'User already registered'
    });
  }
  users[key] = { passwordHash: await bcrypt.hash(password, 10), role };
  writeUsers(users);

  // Create JWT
  const token = jwt.sign({
    exp: Math.floor(Date.now() / 1000) + parseInt(constants.jwt_expiretime),
    username,
    orgName,
    role
  }, app.get('secret'));

  // Compute peers array based on organization
  const computedPeers = orgName === 'PESUHospitalBLR'
    ? ['peer0.blr.pesuhospital.com', 'peer1.blr.pesuhospital.com']
    : ['peer0.kpm.pesuhospital.com', 'peer1.kpm.pesuhospital.com'];

  // Off-chain (CA) registration
  let response = await helper.getRegisteredUser(username, orgName, true, role);
  logger.debug('Registered user %s for org %s: %j', username, orgName, response);
  if (typeof response !== 'string') {
    // invoke chaincode to write the user on-chain (CouchDB)
    await invoke.invokeTransaction(
      'patient-medication-channel',
      'mychaincode',
      'registerUser',
      [username, orgName, role],
      username,
      orgName,
      computedPeers
    );

    // Set JWT as HttpOnly cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure:   process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge:   24 * 60 * 60 * 1000
    });

    // Redirect to login
    return res.redirect('/login');
  } else {
    // CA registration failed
    return res.status(500).json({ success: false, message: response });
  }
});



// process login
app.post('/users/login', async (req, res) => {
  const { username, orgName, password } = req.body;
  if (!username || !orgName || !password) {
    return res.status(400).json(getErrorMessage('username, orgName, and password'));
  }
  const users = readUsers();
  const key   = `${username}@${orgName}`;
  const rec   = users[key];
  if (!rec || !(await bcrypt.compare(password, rec.passwordHash))) {
    return res.status(401).render('login', { error: 'Invalid credentials' });
  }
  // issue JWT + cookie
  const token = jwt.sign({
    exp: Math.floor(Date.now()/1000) + parseInt(constants.jwt_expiretime),
    username, orgName, role: rec.role
  }, app.get('secret'));
  res.cookie('token', token, { httpOnly: true, sameSite: 'strict', maxAge: 86400000 });
  // redirect based on role
  switch (rec.role) {
    case 'receptionist': return res.redirect('/dashboard/receptionist');
    case 'doctor':       return res.redirect('/dashboard/doctor');
    case 'patient':      return res.redirect('/dashboard/patient');
    case 'pharmacist':   return res.redirect('/dashboard/pharmacist');
    default:             return res.redirect('/login');
  }
});

// Render the patient‐registration form, with no error initially
app.get('/registerPatient', (req, res) => {
  res.render('registerPatient', { error: null });
});

// Register patient. Expects JSON: { username, age, orgName, gender }
// Register Patient. Expects form fields: { username, age, orgName, gender, password }
app.post('/registerPatient', async (req, res) => {
  const { username, age, orgName, gender, password } = req.body;

  // 1) Validate
  if (!username || !age || !orgName || !gender || !password) {
    return res.status(400).render('registerPatient', {
      error: 'username, age, orgName, gender and password are all required'
    });
  }

  // 2) Check for existing user
  const users = readUsers();
  const key   = `${username}@${orgName}`;
  if (users[key]) {
    return res.status(409).render('registerPatient', {
      error: 'User already registered'
    });
  }

  // 3) Happy path: save off‐chain
  users[key] = { passwordHash: await bcrypt.hash(password, 10), role: 'patient' };
  writeUsers(users);

  // 4) Create the JWT & cookie
  const token = jwt.sign({
    exp: Math.floor(Date.now() / 1000) + parseInt(constants.jwt_expiretime, 10),
    username, orgName, role: 'patient', age, gender
  }, app.get('secret'));

  res.cookie('token', token, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge:   24 * 60 * 60 * 1000
  });

  // 5) On‐chain (CA + chaincode) registration
  let response = await helper.getRegisteredPatient(username, orgName, age, gender, true);
  if (typeof response === 'string') {
    // CA‐side error
    return res.status(500).render('registerPatient', { error: response });
  }

  // peers for invoke…
  const peers = orgName === 'PESUHospitalBLR'
    ? ['peer0.blr.pesuhospital.com','peer1.blr.pesuhospital.com']
    : ['peer0.kpm.pesuhospital.com','peer1.kpm.pesuhospital.com'];

  await invoke.invokeTransaction(
    'patient-medication-channel',
    'mychaincode',
    'registerPatient',
    [ username, age.toString(), orgName, gender ],
    username,
    orgName,
    peers
  );

  // 6) Success → immediately send them to login
  return res.redirect('/login');
});

// Render the doctor‐registration form, with no error initially
app.get('/registerDoctor', (req, res) => {
  res.render('registerDoctor', { error: null });
});

// Register Doctor. Expects form fields: { username, gender, specialisation, orgName, password }
app.post('/registerDoctor', async (req, res) => {
  const { username, gender, specialisation, orgName, password } = req.body;

  // 1) Validation
  if (!username || !gender || !specialisation || !orgName || !password) {
    return res.status(400).render('registerDoctor', {
      error: 'username, gender, specialisation, orgName and password are all required'
    });
  }

  // 2) Off‐chain user store
  const users = readUsers();
  const key   = `${username}@${orgName}`;
  if (users[key]) {
    return res.status(409).render('registerDoctor', {
      error: 'User already registered'
    });
  }
  users[key] = { passwordHash: await bcrypt.hash(password, 10), role: 'doctor' };
  writeUsers(users);

  // 3) Create JWT cookie
  const token = jwt.sign({
    exp: Math.floor(Date.now()/1000) + parseInt(constants.jwt_expiretime,10),
    username, orgName, role: 'doctor', gender, specialisation
  }, app.get('secret'));
  res.cookie('token', token, {
    httpOnly: true,
    secure:   process.env.NODE_ENV==='production',
    sameSite: 'strict',
    maxAge:   24*60*60*1000
  });

  // 4) CA + on‐chain registration
  let response = await helper.getRegisteredDoctor(
    username, orgName, gender, specialisation, true
  );
  if (typeof response === 'string') {
    // CA failure
    return res.status(500).render('registerDoctor', { error: response });
  }

  // 5) peers array
  const peers = orgName==='PESUHospitalBLR'
    ? ['peer0.blr.pesuhospital.com','peer1.blr.pesuhospital.com']
    : ['peer0.kpm.pesuhospital.com','peer1.kpm.pesuhospital.com'];

  await invoke.invokeTransaction(
    'patient-medication-channel',
    'mychaincode',
    'registerDoctor',
    [ username, gender, specialisation, orgName ],
    username,
    orgName,
    peers
  );

  // 6) Success → back to login
  return res.redirect('/login');
});


app.get('/patientCheckIn', async (req, res) => {
  if (req.role !== 'receptionist') {
    return res.status(403).send('Forbidden');
  }

  const patients = await query.evaluateTransaction(
    'patient-medication-channel', 'mychaincode', 'queryAllPatients', [], req.username, req.orgName
  );
  const doctors = await query.evaluateTransaction(
    'patient-medication-channel', 'mychaincode', 'queryAllDoctors', [], req.username, req.orgName
  );

  const peers = req.orgName === 'PESUHospitalBLR'
    ? ['peer0.blr.pesuhospital.com','peer1.blr.pesuhospital.com']
    : ['peer0.kpm.pesuhospital.com','peer1.kpm.pesuhospital.com'];

  res.render('patientCheckIn', { patients, doctors, peers });
});


// Patient check-in (Registration channel). Expects: { patientID, doctorID, patientInfo, status, peers }
// Patient check-in (Receptionist) + automatic sendMessage
// Patient check-in (Receptionist) + automatic sendMessage
app.post('/patientCheckIn', async (req, res) => {
  if (req.role !== 'receptionist') {
    return res.status(403).json({ success: false, message: 'Unauthorized' });
  }
  const { patientID, doctorID, patientInfo, status, peers } = req.body;
  if (!patientID || !doctorID || !patientInfo || !status) {
    return res.status(400).json({
      success: false,
      message: 'Must include patientID, doctorID, patientInfo and status'
    });
  }

  try {
    // 1) Do the check-in on chain (pass patientInfo as plain text)
    await invoke.invokeTransaction(
      'patient-medication-channel',
      'mychaincode',
      'patientCheckIn',
      [ patientID, doctorID, patientInfo, status ],
      req.username,
      req.orgName,
      peers
    );

    // 2) Look up your own on-chain UUID as the sender
    const me       = await query.getUserByUsername(
      req.username,   // searchUsername
      req.username,   // wallet identity
      req.orgName
    );
    const senderID = me.uuid;

    // 3) Send assignment notice to the patient
    const doctorLogin = doctorID.split(':')[1] || doctorID;
    const assignMsg   = `You’ve been assigned Dr. ${doctorLogin}`;
    await invoke.invokeTransaction(
      'patient-medication-channel',
      'mychaincode',
      'sendMessage',
      [ senderID, patientID, assignMsg ],
      req.username,
      req.orgName,
      peers
    );

    // 4) Forward the receptionist’s notes (patientInfo) to the doctor
    await invoke.invokeTransaction(
      'patient-medication-channel',
      'mychaincode',
      'sendMessage',
      [ senderID, doctorID, patientInfo ],
      req.username,
      req.orgName,
      peers
    );

    // 5) Return a friendly single success message
    return res.json({
      success: true,
      message: 'Checked in and notifications sent.'
    });

  } catch (err) {
    console.error('POST /patientCheckIn error:', err);
    return res.status(500).json({
      success: false,
      message: err.message
    });
  }
});

// ─── Render Check-Out form ───
app.get('/checkOut', async (req, res) => {
  if (req.role !== 'receptionist') {
    return res.status(403).send('Forbidden');
  }

  // 1) Fetch patients & doctors
  const patients = await query.evaluateTransaction(
    'patient-medication-channel', 'mychaincode', 'queryAllPatients',
    [], req.username, req.orgName
  );
  const doctors = await query.evaluateTransaction(
    'patient-medication-channel', 'mychaincode', 'queryAllDoctors',
    [], req.username, req.orgName
  );

  // 2) Build peers array
  const peers = req.orgName === 'PESUHospitalBLR'
    ? ['peer0.blr.pesuhospital.com','peer1.blr.pesuhospital.com']
    : ['peer0.kpm.pesuhospital.com','peer1.kpm.pesuhospital.com'];

  // 3) Render the EJS view
  res.render('checkOut', { patients, doctors, peers });
});

// Check-out (Registration channel). Expects: { patientID, doctorID, patientInfo, status, peers }
// Submission endpoint (protected)

// Patient check-out (Receptionist) + automatic sendMessage
// Check-out (Registration channel). Expects: { patientID, doctorID, message, status, peers }
app.post('/checkOut', async (req, res) => {
  if (req.role !== 'receptionist') {
    return res.status(403).json({ success: false, message: 'Unauthorized' });
  }
  const { patientID, doctorID, patientInfo /* now plain text */, status, peers } = req.body;
  if (!patientID || !doctorID || !patientInfo || !status) {
    return res.status(400).json(getErrorMessage('patientID, doctorID, patientInfo, and status'));
  }
  try {
    // 1) First: perform the checkOut transaction
    const checkOutResult = await invoke.invokeTransaction(
      'patient-medication-channel',
      'mychaincode',
      'checkOut',
      [ patientID, doctorID, patientInfo, status ],  // patientInfo is plain text now
      req.username,
      req.orgName,
      peers
    );

    // 2) Then: sendMessage to the patient
    const userRecord = await query.getUserByUsername(
      req.username,  // searchUsername
      req.username,  // wallet identity
      req.orgName
    );
    const senderID = userRecord.uuid;
    const sendMsgResult = await invoke.invokeTransaction(
      'patient-medication-channel',
      'mychaincode',
      'sendMessage',
      [ senderID, patientID, patientInfo ],  // use the same text
      req.username,
      req.orgName,
      peers
    );

    return res.json({
      success: true,
      checkOutResult,
      sendMsgResult
    });
  } catch (error) {
    console.error('POST /checkOut error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

/*
  ============= Patient-Medication Channel Endpoints =============
*/

// Create Medical Record (doctor only).
// Expects: { patientID, doctorID, symptoms, diagnosis, notes, peers, doctorPrivateKey, patientPublicKey }
// ─── GET /createMedicalRecord ───
app.get('/createMedicalRecord', async (req, res) => {
  if (req.role !== 'doctor') {
    return res.status(403).send('Forbidden');
  }
  try {
    // 1) fetch lists
    const patients = await query.queryAllPatients(req.username, req.orgName);
    const doctors  = await query.queryAllDoctors (req.username, req.orgName);

    // 2) load *your* keys from disk
    const keyFile = path.join(__dirname, 'mcc-keys', `${req.username}.json`);
    const { mccEncryptionPrivateKey, mccEncryptionPublicKey } = JSON.parse(
      fs.readFileSync(keyFile)
    );

    // 3) peers
    const peers = req.orgName === 'PESUHospitalBLR'
      ? ['peer0.blr.pesuhospital.com','peer1.blr.pesuhospital.com']
      : ['peer0.kpm.pesuhospital.com','peer1.kpm.pesuhospital.com'];

    res.render('createMedicalRecord', {
      username: req.username,
      patients,
      doctors,
      doctorEncryptionPrivateKey: mccEncryptionPrivateKey,
      doctorEncryptionPublicKey:  mccEncryptionPublicKey,
      peers
    });
  } catch (e) {
    console.error('render createMedicalRecord error', e);
    res.status(500).send('Unable to load form');
  }
});

// ─── POST /createMedicalRecord ───
app.post('/createMedicalRecord', async (req, res) => {
  if (req.role !== 'doctor') {
    return res.status(403).json({ success: false, message: 'Unauthorized' });
  }

  const { patientID, doctorID, symptoms, diagnosis, notes, peers } = req.body;
  if (!patientID || !doctorID || !symptoms || !diagnosis || !notes) {
    return res.status(400).json(getErrorMessage(
      'patientID, doctorID, symptoms, diagnosis, notes'
    ));
  }

  try {
    // 1) load keys from disk
    const doctorKeyFile = path.join(__dirname, 'mcc-keys', `${req.username}.json`);
    const patientKeyFile= path.join(__dirname, 'mcc-keys', `${patientID.split(':')[1]}.json`);
    const docKeys = JSON.parse(fs.readFileSync(doctorKeyFile));
    const patKeys= JSON.parse(fs.readFileSync(patientKeyFile));

    // 2) derive shared secret
    const docPriv = mcc.decodeKey(docKeys.mccEncryptionPrivateKey);
    const patPub  = mcc.decodeKey(patKeys.mccEncryptionPublicKey);
    const shared  = mcc.generateSharedSecret(docPriv, patPub);

    // 3) encrypt payload
    const record = { patientID, doctorID, symptoms, diagnosis, notes };
    const { ciphertext, nonce } = mcc.encryptData(JSON.stringify(record), shared);

    // 4) build chaincode argument
    const payload = JSON.stringify({ ciphertext, nonce, senderPublicKey: docKeys.mccEncryptionPublicKey });

    // 5) submit
    const tx = await invoke.invokeTransaction(
      'patient-medication-channel',
      'mychaincode',
      'createMedicalRecord',
      [ patientID, doctorID, payload ],
      req.username,
      req.orgName,
      peers
    );
    res.json({ success: true, result: tx });
  } catch (error) {
    console.error('createMedicalRecord POST error:', error);
    res.status(500).json({ success: false, error: error.message });
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
// GET → show the patient a dropdown of their recordIDs
// GET → render dropdown of recordIDs
app.get('/getMedicalRecord', async (req, res) => {
  if (req.role !== 'patient') {
    return res.status(403).send('Forbidden');
  }

  let records = [];
  let loadError = null;

  try {
    // 1) fetch your on-chain user record by login-name
    const userRec = await query.getUserByUsername(
      req.username,  // searchUsername
      req.username,  // wallet identity
      req.orgName
    );
    const patientID = userRec.uuid;  // e.g. "patient:small:..."

    // 2) now fetch *private* records for that patientID
    const rawKeys = await query.queryMedicalRecordsByPatient(
      patientID,
      req.username,
      req.orgName
    );
    records = Array.isArray(rawKeys) ? rawKeys : [];

  } catch (err) {
    console.error('GET /getMedicalRecord error:', err);
    loadError = 'Could not load your record list. Try again later.';
  }

  res.render('getMedicalRecord', {
    username: req.username,
    records,      // now should be an array of medrec-keys
    loadError,
    result: null,
    error: null
  });
});


// POST → fetch + decrypt
app.post('/getMedicalRecord', async (req, res) => {
  if (req.role !== 'patient') {
    return res.status(403).send('Forbidden');
  }
  const { recordID } = req.body;
  // re-fetch list so dropdown still works
  let records = [];
  try {
    records = await query.queryMedicalRecordsByPatient(req.username, req.orgName);
    if (!Array.isArray(records)) records = [];
  } catch(_) { /* ignore fetch error here */ }

  try {
    // load patient’s keys
    const keyFile = path.join(__dirname, 'mcc-keys', `${req.username}.json`);
    const { mccEncryptionPrivateKey, mccSigningPrivateKey, mccSigningPublicKey } =
      JSON.parse(fs.readFileSync(keyFile, 'utf8'));

    // sign challenge
    const challenge = `access_medical_record:${recordID}`;
    const signature = mcc.signMessage(mccSigningPrivateKey, challenge);
    const mccAuthToken = { publicKey: mccSigningPublicKey, signature };

    // fetch encrypted record
    const tx = await invoke.invokeTransaction(
      'patient-medication-channel',
      'mychaincode',
      'getMedicalRecord',
      [ recordID, req.username, JSON.stringify(mccAuthToken) ],
      req.username,
      req.orgName,
      null
    );
    const raw = tx.result;
    const record = typeof raw === 'string' ? JSON.parse(raw) : raw;

    if (!record.encrypted) {
      throw new Error('Malformed record: missing encrypted field');
    }

    // decrypt
    const sharedSecret = mcc.generateSharedSecret(
      mcc.decodeKey(mccEncryptionPrivateKey),
      mcc.decodeKey(record.encrypted.senderPublicKey)
    );
    const plaintext = mcc.decryptData(
      record.encrypted.ciphertext,
      record.encrypted.nonce,
      sharedSecret
    );
    const result = JSON.parse(plaintext);

    res.render('getMedicalRecord', {
      username: req.username,
      records,
      result,
      error: null
    });

  } catch (err) {
    console.error('POST /getMedicalRecord error:', err);
    res.render('getMedicalRecord', {
      username: req.username,
      records,
      result:  null,
      error:   err.message
    });
  }
});


// Get Prescription (secured with MCC). Query parameters: { prescriptionID, receiverID, mccAuthToken, peer, pharmacistPrivateKey, doctorPublicKey }
// ─── Render Create Prescription form ───────────────────────────────
// ─── Render the form ───────────────────────────────────────────────
app.get('/createPrescription', async (req, res) => {
  if (req.role !== 'doctor') {
    return res.status(403).send('Forbidden');
  }
  try {
    const patients    = await query.queryAllPatients(req.username, req.orgName);
    const pharmacists = await query.queryAllPharmacists(req.username, req.orgName);

    // doctor’s own chaincode ID:
    const me       = await query.getUserByUsername(req.username, req.username, req.orgName);
    const doctorID = me.uuid;

    const keyFile = path.join(__dirname, 'mcc-keys', `${req.username}.json`);
    const { mccEncryptionPrivateKey, mccEncryptionPublicKey } = JSON.parse(
      fs.readFileSync(keyFile)
    );

    const peers = req.orgName === 'PESUHospitalBLR'
      ? ['peer0.blr.pesuhospital.com','peer1.blr.pesuhospital.com']
      : ['peer0.kpm.pesuhospital.com','peer1.kpm.pesuhospital.com'];

    res.render('createPrescription', {
      username: req.username,
      doctorID,
      patients,
      pharmacists,
      doctorEncryptionPrivateKey: mccEncryptionPrivateKey,
      doctorEncryptionPublicKey: mccEncryptionPublicKey,
      peers
    });
  } catch (err) {
    console.error('GET /createPrescription error:', err);
    res.status(500).send('Unable to load form');
  }
});

// POST submission
app.post('/createPrescription', async (req, res) => {
  if (req.role !== 'doctor') {
    return res.status(403).json({ success: false, message: 'Unauthorized' });
  }

  const { patientID, doctorID, pharmacistID, medications, billAmount, status, peers } = req.body;
  if (!patientID || !doctorID || !pharmacistID || !medications || billAmount == null || !status) {
    return res.status(400).send('Missing required fields');
  }

  try {
    // Load keys
    const doctorKeyFile   = path.join(__dirname, 'mcc-keys', `${req.username}.json`);
    const patientLogin    = patientID.split(':')[1];
    const pharmacistLogin = pharmacistID.split(':')[1];

    const docKeys = JSON.parse(fs.readFileSync(doctorKeyFile, 'utf8'));
    const patKeys = JSON.parse(fs.readFileSync(
      path.join(__dirname, 'mcc-keys', `${patientLogin}.json`), 'utf8'
    ));
    const phKeys  = JSON.parse(fs.readFileSync(
      path.join(__dirname, 'mcc-keys', `${pharmacistLogin}.json`), 'utf8'
    ));

    // Derive shared secret (doctor ↔ pharmacist)
    const docPriv = mcc.decodeKey(docKeys.mccEncryptionPrivateKey);
    const phPub   = mcc.decodeKey(phKeys.mccEncryptionPublicKey);
    const shared  = mcc.generateSharedSecret(docPriv, phPub);

    // Encrypt the prescription data
    const prescriptionData = {
      patientID,
      doctorID,
      pharmacistID,
      medications: medications.split(/\s*,\s*/),
      billAmount:  parseFloat(billAmount),
      status
    };
    const { ciphertext, nonce } = mcc.encryptData(JSON.stringify(prescriptionData), shared);

    // Build the JSON payload your chaincode expects
    const encryptedPayload = JSON.stringify({
      ciphertext,
      nonce,
      senderPublicKey: docKeys.mccEncryptionPublicKey
    });

    // Invoke chaincode (now passing 4 args)
    await invoke.invokeTransaction(
      'patient-medication-channel',
      'mychaincode',
      'createPrescription',
      [ patientID, doctorID, pharmacistID, encryptedPayload ],
      req.username,
      req.orgName,
      peers || null
    );

    res.json({ success: true, message: 'Prescription submitted successfully' });
  } catch (err) {
    console.error('POST /createPrescription error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});


// ─── GET /getPrescriptions ─────────────────────────────────────────
// ─── GET /getPrescriptions ───────────────────────────────────────────
app.get('/getPrescriptions', async (req, res) => {
  if (req.role !== 'pharmacist') {
    return res.status(403).send('Forbidden');
  }

  const username = req.username;
  let prescriptions = [];
  let loadError     = null;
  let pharmacistID  = null;
  let selected      = null;

  try {
    // 1) fetch your on‐chain pharmacist record by login-name
    const me = await query.getUserByUsername(
      username, // searchUsername
      username, // wallet identity
      req.orgName
    );
    pharmacistID = me.uuid;  // e.g. "user:tania:..."

    // 2) fetch *private* prescriptions for that pharmacistID
    const rawKeys = await query.queryPrescriptionsByPharmacist(
      pharmacistID,
      username,
      req.orgName
    );
    prescriptions = Array.isArray(rawKeys) ? rawKeys : [];

  } catch (err) {
    console.error('GET /getPrescriptions error:', err);
    loadError = 'Could not load your prescriptions. Try again later.';
  }

  // Render with a full, consistent context
  res.render('getPrescriptions', {
    username,
    pharmacistID,
    prescriptions,
    loadError,
    selected,           // no prescription chosen yet
    prescription: null, // decrypted data
    error:    null
  });
});


// ─── POST /getPrescriptions ──────────────────────────────────────────
app.post('/getPrescriptions', async (req, res) => {
  if (req.role !== 'pharmacist') {
    return res.status(403).send('Forbidden');
  }

  const username     = req.username;
  const { prescID, pharmacistID } = req.body;
  if (!prescID || !pharmacistID) {
    return res.status(400).send('Must select a prescription');
  }

  // Re-fetch dropdown list
  let prescriptions = [];
  try {
    const rawKeys = await query.queryPrescriptionsByPharmacist(
      pharmacistID,
      username,
      req.orgName
    );
    prescriptions = Array.isArray(rawKeys) ? rawKeys : [];
  } catch (_) { /* ignore */ }

  try {
    // Load pharmacist’s MCC keys
    const keyFile = path.join(__dirname, 'mcc-keys', `${username}.json`);
    const { mccEncryptionPrivateKey, mccSigningPrivateKey, mccSigningPublicKey } =
      JSON.parse(fs.readFileSync(keyFile, 'utf8'));

    // Build & sign challenge
    const challenge    = `access_prescription:${prescID}`;
    const signature    = mcc.signMessage(mccSigningPrivateKey, challenge);
    const mccAuthToken = { publicKey: mccSigningPublicKey, signature };

    // Fetch the encrypted prescription
    const tx = await invoke.invokeTransaction(
      'patient-medication-channel',
      'mychaincode',
      'getPrescription',
      [ prescID, pharmacistID, JSON.stringify(mccAuthToken) ],
      username,
      req.orgName,
      null
    );
    const raw     = tx.result;
    const payload = typeof raw === 'string' ? JSON.parse(raw) : raw;

    if (!payload.encrypted) {
      throw new Error('Malformed prescription: missing encrypted field');
    }

    // Decrypt with shared secret
    const sharedSecret = mcc.generateSharedSecret(
      mcc.decodeKey(mccEncryptionPrivateKey),
      mcc.decodeKey(payload.encrypted.senderPublicKey)
    );
    const plaintext   = mcc.decryptData(
      payload.encrypted.ciphertext,
      payload.encrypted.nonce,
      sharedSecret
    );
    const result = JSON.parse(plaintext);

    // Render the template with decrypted data and IDs
    res.render('getPrescriptions', {
      username,
      pharmacistID,
      prescriptions,
      selected:      prescID,
      prescription:  result,
      loadError:     null,
      error:         null
    });

  } catch (err) {
    console.error('POST /getPrescriptions error:', err);
    res.render('getPrescriptions', {
      username,
      pharmacistID,
      prescriptions,
      selected:      prescID,
      prescription:  null,
      loadError:     null,
      error:         err.message
    });
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
// in app.js
// ─── Send Message Form ───────────────────────────────────────────────
app.get('/sendMessage', async (req, res) => {
  try {
    const users = await query.queryAllUsers(req.username, req.orgName);
    const peers = req.orgName === 'PESUHospitalBLR'
      ? ['peer0.blr.pesuhospital.com','peer1.blr.pesuhospital.com']
      : ['peer0.kpm.pesuhospital.com','peer1.kpm.pesuhospital.com'];

    res.render('sendMessage', {
      username: req.username,
      orgName:  req.orgName,
      users,
      peers
    });
  } catch (err) {
    console.error('sendMessage GET error:', err);
    res.status(500).send('Failed to load Send Message page');
  }
});

// ─── Send Message Submission ────────────────────────────────────────
// ─── Send Message Submission ────────────────────────────────────────
// ─── Send Message Submission ────────────────────────────────────────
app.post('/sendMessage', async (req, res) => {
  const { recipientID, message, peers } = req.body;
  if (!recipientID || !message) {
    return res.status(400).json({ success: false, message: 'recipientID and message required' });
  }

  try {
    // load your on‐chain record by login‐name, now queries "name"
    const userRecord = await query.getUserByUsername(
      req.username,   // searchUsername
      req.username,   // wallet identity
      req.orgName
    );
    // extract the actual chaincode UUID
    const senderID = userRecord.uuid;

    // invoke sendMessage(senderID, recipientID, message)
    await invoke.invokeTransaction(
      'patient-medication-channel',
      'mychaincode',
      'sendMessage',
      [ senderID, recipientID, message ],
      req.username,
      req.orgName,
      peers
    );

    return res.json({ success: true, message: 'Message sent!' });
  } catch (err) {
    console.error('sendMessage POST error:', err);
    // if chaincode returns "User not found", you’ll now get the right one once chaincode is fixed
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ─── Get Messages Form ───────────────────────────────────────────────
// ─── Get & Show Messages ─────────────────────────────────────────────
app.get('/getMessages', async (req, res) => {
  try {
    const userRecord = await query.getUserByUsername(
      req.username, req.username, req.orgName
    );
    const recipientID = userRecord.uuid;

    const raw = await query.evaluateTransaction(
      'patient-medication-channel',
      'mychaincode',
      'getMessages',
      [recipientID],
      req.username,
      req.orgName
    );
    const messages = (raw || []).map(m => {
      const parts = m.fromId.split(':');
      return {
        content: m.content,
        senderRole: parts[0] || '',
        senderUsername: parts[1] || parts[0] || m.fromId
      };
    });
    
    res.render('getMessages', {
      username: req.username,
      orgName:  req.orgName,
      messages
    });

  } catch (err) {
    console.error('getMessages error:', err);
    res.status(500).send('Failed to fetch messages: ' + err.message);
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

app.get('/register', (req, res) => {
  res.render('register');
});

app.get('/registerPatient', (req, res) => {
  res.render('registerPatient');
});

app.get('/registerDoctor', (req, res) => {
  res.render('registerDoctor');
});

// Render the login page
app.get('/login', (req, res) => {
  res.render('login', { error: null });
});


// generic dashboard handler
app.get('/dashboard/:role', (req, res) => {
  if (req.role !== req.params.role) {
    return res.status(403).send('Forbidden');
  }
  return res.render(`dashboard-${req.params.role}`, { username: req.username });
});



module.exports = app;
