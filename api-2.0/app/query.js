'use strict';

const { Gateway, Wallets } = require('fabric-network');
const helper = require('./helper');

async function evaluateTransaction(channelName, chaincodeName, fcn, args, username, orgName) {
  // 1) Load CCP & wallet
  const ccp = await helper.getCCP(orgName);
  const walletPath = await helper.getWalletPath(orgName);
  const wallet     = await Wallets.newFileSystemWallet(walletPath);

  // 2) Gateway connect (you can also add eventHandlerOptions here if desired)
  const gateway = new Gateway();
  await gateway.connect(ccp, {
    wallet,
    identity: username,
    discovery: { enabled: true, asLocalhost: true },
    eventHandlerOptions: { commitTimeout: 30 }   // ← ensure evaluateTransaction won't timeout early
  });

  // 3) Network & contract
  const network  = await gateway.getNetwork(channelName);
  const contract = network.getContract(chaincodeName);

  // 4) Evaluate
  const resultBuffer = await contract.evaluateTransaction(fcn, ...args);

  // 5) Disconnect
  await gateway.disconnect();

  // 6) Parse or return raw
  try {
    return JSON.parse(resultBuffer.toString());
  } catch {
    return resultBuffer.toString();
  }
}

// … your convenience wrappers below …
async function queryAllPatients(username, orgName) {
  return evaluateTransaction(
    'patient-medication-channel','mychaincode','queryAllPatients',[],username,orgName
  );
}
async function queryAllDoctors(username, orgName) {
  return evaluateTransaction(
    'patient-medication-channel','mychaincode','queryAllDoctors',[],username,orgName
  );
}
async function queryAllPharmacists(username, orgName) {
  return evaluateTransaction(
    'patient-medication-channel','mychaincode','queryAllPharmacists',[],username,orgName
  );
}
async function getUserByUsername(searchUsername, username, orgName) {
  return evaluateTransaction(
    'patient-medication-channel','mychaincode','getUserByUsername',
    [searchUsername],username,orgName
  );
}
async function queryMedicalRecordsByPatient(patientID, username, orgName) {
  return evaluateTransaction(
    'patient-medication-channel','mychaincode','queryMedicalRecordsByPatient',
    [patientID],username,orgName
  );
}
async function queryPrescriptionsByPharmacist(pharmacistID, username, orgName) {
  return evaluateTransaction(
    'patient-medication-channel','mychaincode','queryPrescriptionsByPharmacist',
    [pharmacistID],username,orgName
  );
}

async function queryAllUsers(username, orgName) {
  return evaluateTransaction(
    'patient-medication-channel',
    'mychaincode',
    'queryAllUsers',    // must match your chaincode function name
    [],                  // no args
    username,
    orgName
  );
}

module.exports = {
  evaluateTransaction,
  queryAllPatients,
  queryAllDoctors,
  queryAllPharmacists,
  getUserByUsername,
  queryMedicalRecordsByPatient,
  queryPrescriptionsByPharmacist,
  queryAllUsers
};
