'use strict';

const { Gateway, Wallets } = require('fabric-network');
const helper = require('./helper');

/**
 * Evaluate (query) a transaction against the ledger.
 *
 * @param {string} channelName   The channel to query
 * @param {string} chaincodeName The chaincode to invoke
 * @param {string} fcn           The function name in chaincode
 * @param {string[]} args        Array of string arguments
 * @param {string} username      The enrolled user in your wallet
 * @param {string} orgName       The org MSP (e.g. 'PESUHospitalBLR')
 * @returns {Promise<any>}       The parsed JSON result (or raw string)
*/
async function evaluateTransaction(channelName, chaincodeName, fcn, args, username, orgName) {
  // 1) Load connection profile
  const ccp = await helper.getCCP(orgName);

  // 2) Build (or re-use) a filesystem wallet for this org
  const walletPath = await helper.getWalletPath(orgName);
  const wallet     = await Wallets.newFileSystemWallet(walletPath);

  // 3) Connect to gateway
  const gateway = new Gateway();
  await gateway.connect(ccp, {
    wallet,
    identity: username,
    discovery: { enabled: true, asLocalhost: true }
  });

  // 4) Grab the network & contract
  const network  = await gateway.getNetwork(channelName);
  const contract = network.getContract(chaincodeName);

  // 5) Evaluate the transaction
  const resultBuffer = await contract.evaluateTransaction(fcn, ...args);

  // 6) Clean up
  await gateway.disconnect();

  // 7) JSON-parse if possible, else return raw string
  try {
    return JSON.parse(resultBuffer.toString());
  } catch {
    return resultBuffer.toString();
  }
}

/**
 * Convenience wrapper: fetches all patients (chaincode fcn 'queryAllPatients').
 */
async function queryAllPatients(username, orgName) {
  return evaluateTransaction(
    'patient-medication-channel',
    'mychaincode',
    'queryAllPatients',
    [],           // no args
    username,
    orgName
  );
}

/**
 * Convenience wrapper: fetches all doctors (chaincode fcn 'queryAllDoctors').
 */
async function queryAllDoctors(username, orgName) {
  return evaluateTransaction(
    'patient-medication-channel',
    'mychaincode',
    'queryAllDoctors',
    [],
    username,
    orgName
  );
}

/**
 * Convenience wrapper: fetches all users (chaincode fcn 'queryAllUsers').
 */
async function queryAllUsers(username, orgName) {
  return evaluateTransaction(
    'patient-medication-channel',
    'mychaincode',
    'queryAllUsers',
    [],
    username,
    orgName
  );
}

/**
 * Convenience wrapper: fetches a user by username (chaincode fcn 'getUserByUsername').
 * @param {string} searchUsername - the username to search for
 */
async function getUserByUsername(searchUsername, username, orgName) {
  return evaluateTransaction(
    'patient-medication-channel',
    'mychaincode',
    'getUserByUsername',
    [searchUsername], // Pass the username you are searching for
    username,
    orgName
  );
}

async function queryRecordsByPatient(username, orgName) {
  return evaluateTransaction(
    'patient-medication-channel',
    'mychaincode',
    'queryRecordsByPatient',
    [],
    username,
    orgName
  );
}

async function queryMedicalRecordsByPatient(patientID, username, orgName) {
  return evaluateTransaction(
    'patient-medication-channel',
    'mychaincode',
    'queryMedicalRecordsByPatient',
    [ patientID ],
    username,
    orgName
  );
}

async function queryAllPharmacists(username, orgName) {
  return evaluateTransaction(
    'patient-medication-channel',
    'mychaincode',
    'queryAllPharmacists',
    [],           // no args
    username,
    orgName
  );
}

async function queryPrescriptionsByPharmacist(pharmacistID, username, orgName) {
  return evaluateTransaction(
    'patient-medication-channel',
    'mychaincode',
    'queryPrescriptionsByPharmacist',
    [ pharmacistID ],
    username,
    orgName
  );
}

module.exports = {
  evaluateTransaction,
  queryAllPatients,
  queryAllDoctors,
  queryAllUsers,
  queryRecordsByPatient,
  getUserByUsername,
  queryMedicalRecordsByPatient,
  queryAllPharmacists,
  queryPrescriptionsByPharmacist
};
