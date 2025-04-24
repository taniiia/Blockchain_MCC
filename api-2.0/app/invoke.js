'use strict';

const { Gateway, Wallets, DefaultEventHandlerStrategies } = require('fabric-network');
const fs = require('fs');
const path = require('path');
const log4js = require('log4js');
const logger = log4js.getLogger('BasicNetwork');
log4js.configure({
    appenders: { out: { type: 'console' } },
    categories: { default: { appenders: ['out'], level: 'debug' } }
  });
const util = require('util');

const helper = require('./helper');

async function invokeTransaction(channelName, chaincodeName, fcn, args, username, org_name, transientData) {
    try {
        logger.debug(util.format('\n============ Invoke transaction on channel %s, function %s ============\n', channelName, fcn));

        // Load network configuration (CCP)
        const ccp = await helper.getCCP(org_name);

        // Create a wallet using the filesystem-based wallet
        const walletPath = await helper.getWalletPath(org_name);
        const wallet = await Wallets.newFileSystemWallet(walletPath);
        logger.debug(`Wallet path: ${walletPath}`);

        // Check to see if the identity exists in the wallet
        let identity = await wallet.get(username);
        if (!identity) {
            logger.error(`An identity for the user ${username} does not exist in the wallet`);
            throw new Error(`An identity for the user ${username} does not exist in the wallet. Run the registration process first.`);
        }

        // Set up connection options
        const connectOptions = {
            wallet,
            identity: username,
            discovery: { enabled: true, asLocalhost: true },
            eventHandlerOptions: {
                commitTimeout: 100,
                strategy: DefaultEventHandlerStrategies.NETWORK_SCOPE_ALLFORTX
            }
        };

        // Create a new gateway for connecting to our peer node
        const gateway = new Gateway();
        await gateway.connect(ccp, connectOptions);

        // Get the network (channel) our contract is deployed to.
        const network = await gateway.getNetwork(channelName);

        // Get the contract from the network.
        const contract = network.getContract(chaincodeName);

        let result;
        // If transientData is provided, attach it to the transaction.
        if (transientData) {
            const transientDataBuffer = {};
            // Each key in transientData is set into the transaction as a Buffer containing a JSON string.
            Object.keys(transientData).forEach(key => {
                transientDataBuffer[key] = Buffer.from(JSON.stringify(transientData[key]));
            });
            result = await contract.createTransaction(fcn)
                .setTransient(transientDataBuffer)
                .submit(...args);
        } else {
            result = await contract.submitTransaction(fcn, ...args);
        }

        // Disconnect the gateway once the transaction has been submitted.
        await gateway.disconnect();

        // Parse the result as JSON.
        let parsedResult = {};
        try {
            parsedResult = JSON.parse(result.toString());
        } catch (e) {
            parsedResult = result.toString();
        }

        let response = {
            message: `Transaction ${fcn} has been submitted successfully`,
            result: parsedResult
        };

        return response;
    } catch (error) {
        logger.error(`Error in invokeTransaction: ${error}`);
        throw new Error(`Failed to submit transaction: ${error.message}`);
    }
}

exports.invokeTransaction = invokeTransaction;
