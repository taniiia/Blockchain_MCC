'use strict';

const { Gateway, Wallets, DefaultEventHandlerStrategies } = require('fabric-network');
const fs = require('fs');
const path = require('path');
const log4js = require('log4js');
const util = require('util');
const helper = require('./helper');

log4js.configure({
  appenders: { out: { type: 'console' } },
  categories: { default: { appenders: ['out'], level: 'debug' } }
});
const logger = log4js.getLogger('BasicNetwork');

async function invokeTransaction(channelName, chaincodeName, fcn, args, username, org_name, transientData) {
  try {
    logger.debug(util.format(
      '\n============ Invoke transaction on channel %s, function %s ============\n',
      channelName, fcn
    ));

    // 1) CCP & wallet
    const ccp = await helper.getCCP(org_name);
    const walletPath = await helper.getWalletPath(org_name);
    const wallet = await Wallets.newFileSystemWallet(walletPath);
    logger.debug(`Wallet path: ${walletPath}`);

    // 2) Gateway connect with extended commitTimeout
    const gateway = new Gateway();
    await gateway.connect(ccp, {
      wallet,
      identity: username,
      discovery: { enabled: true, asLocalhost: true },
      eventHandlerOptions: {
        commitTimeout: 30,                                   // ← wait up to 30s
        strategy: DefaultEventHandlerStrategies.NETWORK_SCOPE_ALLFORTX
      }
    });

    // 3) Get network & contract
    const network = await gateway.getNetwork(channelName);
    const contract = network.getContract(chaincodeName);

    // 4) Submit (with or without transient data)
    let result;
    if (transientData) {
      const transientDataBuffer = {};
      for (const k of Object.keys(transientData)) {
        transientDataBuffer[k] = Buffer.from(JSON.stringify(transientData[k]));
      }
      result = await contract.createTransaction(fcn)
        .setTransient(transientDataBuffer)
        .submit(...args);
    } else {
      result = await contract.submitTransaction(fcn, ...args);
    }

    // 5) Disconnect & parse
    await gateway.disconnect();
    let parsedResult;
    try { parsedResult = JSON.parse(result.toString()); }
    catch { parsedResult = result.toString(); }

    return {
      message: `Transaction ${fcn} has been submitted successfully`,
      result: parsedResult
    };
  } catch (error) {
    logger.error(`Error in invokeTransaction: ${error}`);
    throw new Error(`Failed to submit transaction: ${error.message}`);
  }
}

exports.invokeTransaction = invokeTransaction;
