'use strict';

const mcc = require('./mcc.js');
const log4js = require('log4js');
const logger = log4js.getLogger('Helper');
logger.setLevel('DEBUG');

const path = require('path');
const util = require('util');
const hfc = require('fabric-client');
hfc.setLogger(logger);

//communicate with the blockchain network
//enroll or authenticate user
//interact with chaincode
//This is your Fabric bootstrapper per org + user.
async function getClientForOrg(userorg, username) {
  logger.debug('getClientForOrg START %s, %s', userorg, username);
  const configSuffix = '-connection-profile-path';
  const client = hfc.loadFromConfig(hfc.getConfigSetting('network' + configSuffix));
  client.loadFromConfig(hfc.getConfigSetting(userorg + configSuffix));
  await client.initCredentialStores();
  if (username) {
    let userObj = await client.getUserContext(username, true);
    if (!userObj) {
      throw new Error(util.format('User %s not found', username));
    }
    logger.debug('User %s is registered and enrolled', username);
  }
  logger.debug('getClientForOrg END %s, %s', userorg, username);
  return client;
}

async function getRegisteredUser(username, userOrg, userRole, isJson) {
  try {
    const client = await getClientForOrg(userOrg, username);
    logger.debug('Initialized credential stores');
    let userObj = await client.getUserContext(username, true);
    if (userObj && userObj.isEnrolled()) {
      logger.info('Loaded member from persistence');
    } else {
      logger.info('User %s is not enrolled; registering...', username);
      const admins = hfc.getConfigSetting('admins');
      let adminUserObj = await client.setUserContext({ username: admins[0].username, password: admins[0].secret });
      let caClient = client.getCertificateAuthority();
      let secret = await caClient.register({
        enrollmentID: username,
        affiliation: userOrg.toLowerCase(),
        attrs: [{ name: 'role', value: userRole, ecert: true }]
      }, adminUserObj);
      logger.debug('Got secret for user %s', username);
      userObj = await client.setUserContext({ 
        username: username, 
        password: secret, 
        attr_reqs: [{ name: 'role', optional: false }]
      });
      logger.debug('Enrolled user %s successfully', username);
    }
    if (userObj && userObj.isEnrolled()) {
      // Generate an MCC key pair for off-chain cryptographic operations
      // In a production system, you’d generate this once and store it securely.
      const keyPair = mcc.generateKeyPair();
      const mccPrivateKey = mcc.encodeKey(keyPair.secretKey); // Base64 string
      const mccPublicKey = mcc.encodeKey(keyPair.publicKey);    // Base64 string

      if (isJson) {
        return {
          success: true,
          secret: userObj._enrollmentSecret,
          message: `${username} enrolled Successfully`,
          mccPrivateKey, // In production, avoid sending the private key back to the client!
          mccPublicKey
        };
      }
      return userObj;
    }
    throw new Error('User was not enrolled');
  } catch (error) {
    logger.error('Error in getRegisteredUser: %s', error.toString());
    return 'failed ' + error.toString();
  }
}

async function getRegisteredDoctor(username, userOrg, userRole, gender, specialisation, isJson) {

  try {
    const client = await getClientForOrg(userOrg, username);
    logger.debug('Initialized credential stores for doctor');
    let userObj = await client.getUserContext(username, true);

    if (userObj && userObj.isEnrolled()) {
      logger.info('Loaded doctor from persistence');
    } else {
      logger.info('Doctor %s is not enrolled; registering...', username);
      const admins = hfc.getConfigSetting('admins');
      let adminUserObj = await client.setUserContext({
        username: admins[0].username,
        password: admins[0].secret
      });

      const caClient = client.getCertificateAuthority();
      const secret = await caClient.register({
        enrollmentID: username,
        affiliation: userOrg.toLowerCase(),
        attrs: [
          { name: 'role', value: userRole, ecert: true },
          { name: 'gender', value: gender, ecert: true },
          { name: 'specialisation', value: specialisation, ecert: true }
        ]
      }, adminUserObj);

      logger.debug('Got secret for doctor %s', username);
      userObj = await client.setUserContext({
        username: username,
        password: secret,
        attr_reqs: [
          { name: 'role', optional: false },
          { name: 'gender', optional: false },
          { name: 'specialisation', optional: false }
        ]
      });
      logger.debug('Enrolled doctor %s successfully', username);
    }

    if (userObj && userObj.isEnrolled()) {
      if (isJson) {
        // Generate an MCC key pair using the mcc module
        const keyPair = mcc.generateKeyPair();
        const mccPrivateKey = mcc.encodeKey(keyPair.secretKey);
        const mccPublicKey = mcc.encodeKey(keyPair.publicKey);
        return {
          success: true,
          secret: userObj._enrollmentSecret,
          message: `${username} enrolled successfully`,
          mccPrivateKey,  // In production, avoid returning private keys!
          mccPublicKey
        };
      }
      return userObj;
    }

    throw new Error('Doctor was not enrolled');
  } catch (error) {
    logger.error('Error in getRegisteredDoctor: %s', error.toString());
    return 'failed ' + error.toString();
  }
}

async function getRegisteredPatient(username, userOrg, userRole, age, gender, isJson) {

  try {
    const client = await getClientForOrg(userOrg, username);
    logger.debug('Initialized credential stores for patient');
    let userObj = await client.getUserContext(username, true);

    if (userObj && userObj.isEnrolled()) {
      logger.info('Loaded patient from persistence');
    } else {
      logger.info('Patient %s is not enrolled; registering...', username);
      const admins = hfc.getConfigSetting('admins');
      let adminUserObj = await client.setUserContext({
        username: admins[0].username,
        password: admins[0].secret
      });

      const caClient = client.getCertificateAuthority();
      const secret = await caClient.register({
        enrollmentID: username,
        affiliation: userOrg.toLowerCase(),
        attrs: [
          { name: 'role', value: userRole, ecert: true },
          { name: 'age', value: age.toString(), ecert: true },
          { name: 'gender', value: gender, ecert: true }
        ]
      }, adminUserObj);

      logger.debug('Got secret for patient %s', username);
      userObj = await client.setUserContext({
        username: username,
        password: secret,
        attr_reqs: [
          { name: 'role', optional: false },
          { name: 'age', optional: false },
          { name: 'gender', optional: false }
        ]
      });
      logger.debug('Enrolled patient %s successfully', username);
    }

    if (userObj && userObj.isEnrolled()) {
      if (isJson) {
        // Generate an MCC key pair for the patient
        const keyPair = mcc.generateKeyPair();
        const mccPrivateKey = mcc.encodeKey(keyPair.secretKey);
        const mccPublicKey = mcc.encodeKey(keyPair.publicKey);
        return {
          success: true,
          secret: userObj._enrollmentSecret,
          message: `${username} enrolled successfully`,
          mccPrivateKey,  // In production, do not return the private key!
          mccPublicKey
        };
      }
      return userObj;
    }

    throw new Error('Patient was not enrolled');
  } catch (error) {
    logger.error('Error in getRegisteredPatient: %s', error.toString());
    return 'failed ' + error.toString();
  }
}


function setupChaincodeDeploy() {
  process.env.GOPATH = path.join(__dirname, hfc.getConfigSetting('CC_SRC_PATH'));
}

function getLogger(moduleName) {
  const log = log4js.getLogger(moduleName);
  log.setLevel('DEBUG');
  return log;
}

module.exports = {
  getClientForOrg,
  getRegisteredUser,
  getRegisteredDoctor,
  getRegisteredPatient,
  setupChaincodeDeploy,
  getLogger
};
