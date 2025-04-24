'use strict';

const util = require('util');
const path = require('path');
const helper = require('./helper.js');
const logger = helper.getLogger('Install-Chaincode');

const installChaincode = async function (peers, chaincodeName, chaincodePath, chaincodeVersion, chaincodeType, username, orgName) {
	logger.debug('\n\n============ Install chaincode on organization "%s" ============\n', orgName);
	let error_message = null;

	try {
		// Set up the client for this org
		const client = await helper.getClientForOrg(orgName, username);
		logger.debug('Successfully got the fabric client for the organization "%s"', orgName);

		// Chaincode path must be absolute or relative to GOPATH/src for Go chaincode
		let chaincodePackagePath = chaincodePath;
		if (!path.isAbsolute(chaincodePath)) {
			chaincodePackagePath = path.join(__dirname, '..', chaincodePath); // fallback
		}

		const request = {
			targets: peers,
			chaincodePath: chaincodePackagePath,
			chaincodeId: chaincodeName,
			chaincodeVersion: chaincodeVersion,
			chaincodeType: chaincodeType // 'golang'
		};

		const results = await client.installChaincode(request);
		const proposalResponses = results[0];

		let allGood = true;
		for (let i in proposalResponses) {
			const res = proposalResponses[i];
			if (res && res.response && res.response.status === 200) {
				logger.info(`Install proposal was good for peer ${peers[i]}`);
			} else {
				allGood = false;
				logger.error(`Install proposal was bad for peer ${peers[i]}:`, res);
			}
		}

		if (allGood) {
			const message = `Successfully installed chaincode "${chaincodeName}" version "${chaincodeVersion}" on org "${orgName}"`;
			logger.info(message);
			return {
				success: true,
				message
			};
		} else {
			error_message = 'Some install proposals failed';
			logger.error(error_message);
		}

	} catch (error) {
		logger.error('Failed to install chaincode due to error:', error.stack || error);
		error_message = error.toString();
	}

	if (!error_message) {
		return {
			success: true,
			message: 'Chaincode installed successfully'
		};
	} else {
		throw new Error(`Failed to install chaincode: ${error_message}`);
	}
};

module.exports = {
	installChaincode
};
