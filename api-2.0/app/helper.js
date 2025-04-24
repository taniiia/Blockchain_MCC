'use strict';

const { Gateway, Wallets } = require('fabric-network');
const path = require('path');
const FabricCAServices = require('fabric-ca-client');
const fs = require('fs');
const log4js = require('log4js');
const logger = log4js.getLogger('BasicNetwork');
log4js.configure({
    appenders: { out: { type: 'console' } },
    categories: { default: { appenders: ['out'], level: 'debug' } }
  });
const util = require('util');
const mcc = require('./mcc.js'); // Your custom MCC module for key generation, encryption, signing, etc.

// Load the connection profile (CCP) based on the org.
const getCCP = async (org) => {
    let ccpPath;
    if (org === "PESUHospitalBLR") {
        ccpPath = path.resolve(__dirname, '..', 'config', 'connection-blr.json');
    } else if (org === "PESUHospitalKPM") {
        ccpPath = path.resolve(__dirname, '..', 'config', 'connection-kpm.json');
    } else {
        logger.error(`No connection profile available for organization: ${org}`);
        return null;
    }
    const ccpJSON = fs.readFileSync(ccpPath, 'utf8');
    const ccp = JSON.parse(ccpJSON);
    logger.debug(`Loaded CCP for org ${org} from ${ccpPath}`);
    return ccp;
};

// Get the CA URL from the connection profile.
const getCaUrl = async (org, ccp) => {
    let caURL;
    if (org === "PESUHospitalBLR") {
        caURL = ccp.certificateAuthorities['ca.blr.pesuhospital.com'].url;
    } else if (org === "PESUHospitalKPM") {
        caURL = ccp.certificateAuthorities['ca.kpm.pesuhospital.com'].url;
    } else {
        return null;
    }
    return caURL;
};

// Get the wallet path for a given org.
const getWalletPath = async (org) => {
    let walletPath;
    if (org === "PESUHospitalBLR") {
        walletPath = path.join(process.cwd(), 'blr-wallet');
    } else if (org === "PESUHospitalKPM") {
        walletPath = path.join(process.cwd(), 'kpm-wallet');
    } else {
        return null;
    }
    return walletPath;
};

// For enrollment, return an affiliation. This could be more detailed if needed.
const getAffiliation = async (org) => {
    switch (org) {
      case 'PESUHospitalBLR':
        return 'blr';
      case 'PESUHospitalKPM':
        return 'kpm';
      default:
        throw new Error(`Unknown org "${org}"`);
    }
};

// Enroll the admin for the given organization.
const enrollAdmin = async (org, ccp) => {
    try {
        console.log('Calling enrollAdmin for org', org);
        let caInfo;

        if (org === "PESUHospitalBLR") {
            caInfo = ccp.certificateAuthorities['ca.blr.pesuhospital.com'];
        } else if (org === "PESUHospitalKPM") {
            caInfo = ccp.certificateAuthorities['ca.kpm.pesuhospital.com'];
        } else {
            console.log('Which org pa this is?');
            return;
        }

        const caTLSCACerts = caInfo.tlsCACerts.pem;
        const ca = new FabricCAServices(caInfo.url, { trustedRoots: caTLSCACerts, verify: false }, caInfo.caName);
        const walletPath = await getWalletPath(org);
        const wallet = await Wallets.newFileSystemWallet(walletPath);
        console.log(`Wallet path: ${walletPath}`);

        const identity = await wallet.get('admin');
        if (identity) {
            console.log('Admin identity already exists in wallet');
            return;
        }

        // Enroll the admin user.
        const enrollment = await ca.enroll({
            enrollmentID: 'admin',
            enrollmentSecret: 'adminpw',
            attr_reqs: [
              { name: 'hf.Registrar.Roles', optional: false },
              { name: 'hf.Registrar.Attributes', optional: false }
            ]
          });

        let x509Identity;
        if (org === "PESUHospitalBLR") {
            x509Identity = {
                credentials: {
                    certificate: enrollment.certificate,
                    privateKey: enrollment.key.toBytes(),
                },
                mspId: 'PESUHospitalBLRMSP',
                type: 'X.509',
            };
        } else if (org === "PESUHospitalKPM") {
            x509Identity = {
                credentials: {
                    certificate: enrollment.certificate,
                    privateKey: enrollment.key.toBytes(),
                },
                mspId: 'PESUHospitalKPMMSP',
                type: 'X.509',
            };
        }

        await wallet.put('admin', x509Identity);
        console.log('Successfully enrolled admin for', org);

    } catch (error) {
        console.error('Failed to register admin:', error.message);
    }
};


// ================== getRegisteredUser Function ==================
const getRegisteredUser = async (username, userOrg, isJson, role) => {
    const ccp = await getCCP(userOrg);
    const caURL = await getCaUrl(userOrg, ccp);
    const ca = new FabricCAServices(caURL);
    const walletPath = await getWalletPath(userOrg);
    const wallet = await Wallets.newFileSystemWallet(walletPath);

  const userIdentity = await wallet.get(username);
  if (userIdentity) {
    if (isJson) {
      // fresh MCC key‑pairs
      const boxKeys  = mcc.generateBoxKeyPair();
      const signKeys = mcc.generateSignKeyPair();
      return {
        success: true,
        message: `${username} enrolled Successfully`,
        mccEncryptionPrivateKey: mcc.encodeKey(boxKeys.secretKey),
        mccEncryptionPublicKey:  mcc.encodeKey(boxKeys.publicKey),
        mccSigningPrivateKey:     mcc.encodeKey(signKeys.secretKey),
        mccSigningPublicKey:      mcc.encodeKey(signKeys.publicKey)
      };
    }
    return { success: true, message: `${username} enrolled Successfully` };
  }

    // enroll admin if needed
    let adminIdentity = await wallet.get('admin');
    if (!adminIdentity) {
        console.log('Admin identity not found in wallet');
        await enrollAdmin(userOrg, ccp);
        adminIdentity = await wallet.get('admin');
    }
    const provider  = wallet.getProviderRegistry().getProvider(adminIdentity.type);
    const adminUser = await provider.getUserContext(adminIdentity, 'admin');

    // register & enroll new user
    let secret;
    try {
        secret = await ca.register({
            affiliation: await getAffiliation(userOrg),
            enrollmentID: username,
            role: 'client',
            attrs: [ { name: 'role', value: role, ecert: true } ]
        }, adminUser);
    } catch (error) {
        return error.message;
    }
    const enrollment = await ca.enroll({
        enrollmentID: username,
        enrollmentSecret: secret,
        attr_reqs: [ { name: 'role', optional: false } ]
    });

    // build X.509 identity
    const x509Identity = {
        credentials: {
            certificate: enrollment.certificate,
            privateKey: enrollment.key.toBytes()
        },
        mspId: userOrg === "PESUHospitalBLR" ? "PESUHospitalBLRMSP" : "PESUHospitalKPMMSP",
        type: 'X.509'
    };
    await wallet.put(username, x509Identity);
    console.log(`Successfully registered and enrolled user ${username}`);

    // generate and return MCC keys
    const boxKeys  = mcc.generateBoxKeyPair();
    const signKeys = mcc.generateSignKeyPair();
  if (isJson) {
    return {
      success: true,
      message: `${username} enrolled Successfully`,
      mccEncryptionPrivateKey: mcc.encodeKey(boxKeys.secretKey),
      mccEncryptionPublicKey:  mcc.encodeKey(boxKeys.publicKey),
      mccSigningPrivateKey:     mcc.encodeKey(signKeys.secretKey),
      mccSigningPublicKey:      mcc.encodeKey(signKeys.publicKey)
    };
  }
  return x509Identity;
};

// ================== getRegisteredDoctor Function ==================
const getRegisteredDoctor = async (username, userOrg, gender, specialisation, isJson) => {
    const ccp = await getCCP(userOrg);
    const caURL = await getCaUrl(userOrg, ccp);
    const ca = new FabricCAServices(caURL);
    const walletPath = await getWalletPath(userOrg);
    const wallet = await Wallets.newFileSystemWallet(walletPath);
    console.log(`Wallet path: ${walletPath}`);

    const userIdentity = await wallet.get(username);
  if (userIdentity) {
    if (isJson) {
      // fresh MCC key‑pairs
      const boxKeys  = mcc.generateBoxKeyPair();
      const signKeys = mcc.generateSignKeyPair();
      return {
        success: true,
        message: `${username} enrolled Successfully`,
        mccEncryptionPrivateKey: mcc.encodeKey(boxKeys.secretKey),
        mccEncryptionPublicKey:  mcc.encodeKey(boxKeys.publicKey),
        mccSigningPrivateKey:     mcc.encodeKey(signKeys.secretKey),
        mccSigningPublicKey:      mcc.encodeKey(signKeys.publicKey)
      };
    }
    return { success: true, message: `${username} enrolled Successfully` };
  }

    let adminIdentity = await wallet.get('admin');
    if (!adminIdentity) {
        console.log('Admin identity not found in wallet');
        await enrollAdmin(userOrg, ccp);
        adminIdentity = await wallet.get('admin');
    }
    const provider  = wallet.getProviderRegistry().getProvider(adminIdentity.type);
    const adminUser = await provider.getUserContext(adminIdentity, 'admin');

    let secret;
    try {
        secret = await ca.register({
            affiliation: await getAffiliation(userOrg),
            enrollmentID: username,
            role: 'client',
            attrs: [
                { name: 'role', value: 'doctor', ecert: true },
                { name: 'gender', value: gender, ecert: true },
                { name: 'specialisation', value: specialisation, ecert: true }
            ]
        }, adminUser);
    } catch (error) {
        return error.message;
    }
    const enrollment = await ca.enroll({
        enrollmentID: username,
        enrollmentSecret: secret,
        attr_reqs: [ { name: 'role', optional: false } ]
    });

    const x509Identity = {
        credentials: {
            certificate: enrollment.certificate,
            privateKey: enrollment.key.toBytes()
        },
        mspId: userOrg === "PESUHospitalBLR" ? "PESUHospitalBLRMSP" : "PESUHospitalKPMMSP",
        type: 'X.509'
    };
    await wallet.put(username, x509Identity);
    console.log(`Successfully registered and enrolled doctor ${username}`);

    const boxKeys  = mcc.generateBoxKeyPair();
    const signKeys = mcc.generateSignKeyPair();
  if (isJson) {
    return {
      success: true,
      message: `${username} enrolled Successfully`,
      mccEncryptionPrivateKey: mcc.encodeKey(boxKeys.secretKey),
      mccEncryptionPublicKey:  mcc.encodeKey(boxKeys.publicKey),
      mccSigningPrivateKey:     mcc.encodeKey(signKeys.secretKey),
      mccSigningPublicKey:      mcc.encodeKey(signKeys.publicKey)
    };
  }
  return x509Identity;
};

// ================== getRegisteredPatient Function ==================
const getRegisteredPatient = async (username, userOrg, age, gender, isJson) => {
    const ccp = await getCCP(userOrg);
    const caURL = await getCaUrl(userOrg, ccp);
    const ca = new FabricCAServices(caURL);
    const walletPath = await getWalletPath(userOrg);
    const wallet = await Wallets.newFileSystemWallet(walletPath);
    console.log(`Wallet path: ${walletPath}`);

    const userIdentity = await wallet.get(username);
  if (userIdentity) {
    if (isJson) {
      // fresh MCC key‑pairs
      const boxKeys  = mcc.generateBoxKeyPair();
      const signKeys = mcc.generateSignKeyPair();
      return {
        success: true,
        message: `${username} enrolled Successfully`,
        mccEncryptionPrivateKey: mcc.encodeKey(boxKeys.secretKey),
        mccEncryptionPublicKey:  mcc.encodeKey(boxKeys.publicKey),
        mccSigningPrivateKey:     mcc.encodeKey(signKeys.secretKey),
        mccSigningPublicKey:      mcc.encodeKey(signKeys.publicKey)
      };
    }
    return { success: true, message: `${username} enrolled Successfully` };
  }

    let adminIdentity = await wallet.get('admin');
    if (!adminIdentity) {
        console.log('Admin identity not found in wallet');
        await enrollAdmin(userOrg, ccp);
        adminIdentity = await wallet.get('admin');
    }
    const provider  = wallet.getProviderRegistry().getProvider(adminIdentity.type);
    const adminUser = await provider.getUserContext(adminIdentity, 'admin');

    let secret;
    try {
        secret = await ca.register({
            affiliation: await getAffiliation(userOrg),
            enrollmentID: username,
            role: 'client',
            attrs: [
                { name: 'role', value: 'patient', ecert: true },
                { name: 'age', value: age.toString(), ecert: true },
                { name: 'gender', value: gender, ecert: true }
            ]
        }, adminUser);
    } catch (error) {
        return error.message;
    }
    const enrollment = await ca.enroll({
        enrollmentID: username,
        enrollmentSecret: secret,
        attr_reqs: [ { name: 'role', optional: false } ]
    });

    const x509Identity = {
        credentials: {
            certificate: enrollment.certificate,
            privateKey: enrollment.key.toBytes()
        },
        mspId: userOrg === "PESUHospitalBLR" ? "PESUHospitalBLRMSP" : "PESUHospitalKPMMSP",
        type: 'X.509'
    };
    await wallet.put(username, x509Identity);
    console.log(`Successfully registered and enrolled patient ${username}`);

    const boxKeys  = mcc.generateBoxKeyPair();
    const signKeys = mcc.generateSignKeyPair();
  if (isJson) {
    return {
      success: true,
      message: `${username} enrolled Successfully`,
      mccEncryptionPrivateKey: mcc.encodeKey(boxKeys.secretKey),
      mccEncryptionPublicKey:  mcc.encodeKey(boxKeys.publicKey),
      mccSigningPrivateKey:     mcc.encodeKey(signKeys.secretKey),
      mccSigningPublicKey:      mcc.encodeKey(signKeys.publicKey)
    };
  }
  return x509Identity;
};

const isUserRegistered = async (username, userOrg) => {
    const walletPath = await getWalletPath(userOrg);
    const wallet = await Wallets.newFileSystemWallet(walletPath);
    console.log(`Wallet path: ${walletPath}`);

    const userIdentity = await wallet.get(username);
    if (userIdentity) {
        console.log(`An identity for the user ${username} exists in the wallet`);
        return true;
    }
    return false;
};

const registerAndGerSecret = async (username, userOrg) => {
    const ccp = await getCCP(userOrg);
    const caURL = await getCaUrl(userOrg, ccp);
    const ca = new FabricCAServices(caURL);
    const walletPath = await getWalletPath(userOrg);
    const wallet = await Wallets.newFileSystemWallet(walletPath);
    console.log(`Wallet path: ${walletPath}`);

    const userIdentity = await wallet.get(username);
    if (userIdentity) {
        console.log(`An identity for the user ${username} already exists in the wallet`);
        return {
            success: true,
            message: `${username} enrolled Successfully`
        };
    }

    // Ensure admin is enrolled.
    let adminIdentity = await wallet.get('admin');
    if (!adminIdentity) {
        console.log('Admin identity not found in the wallet');
        await enrollAdmin(userOrg, ccp);
        adminIdentity = await wallet.get('admin');
        console.log("Admin enrolled successfully");
    }
    const provider = wallet.getProviderRegistry().getProvider(adminIdentity.type);
    const adminUser = await provider.getUserContext(adminIdentity, 'admin');
    let secret;
    try {
        secret = await ca.register({ affiliation: await getAffiliation(userOrg), enrollmentID: username, role: 'client' }, adminUser);
    } catch (error) {
        return error.message;
    }

    return {
        success: true,
        message: `${username} enrolled Successfully`,
        secret: secret
    };
};

module.exports = {
    getCCP,
    getWalletPath,
    getRegisteredUser,
    getRegisteredDoctor,
    getRegisteredPatient,
    isUserRegistered,
    registerAndGerSecret
};
