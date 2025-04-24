/**
 * Copyright 2017 IBM All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */
'use strict';

const util = require('util');
const helper = require('./helper.js');
const logger = helper.getLogger('instantiate-chaincode');

const instantiateChaincode = async function (peers, channelName, chaincodeName, chaincodeVersion, functionName, chaincodeType, args, username, org_name) {
	logger.debug(`\n\n============ Instantiate chaincode on channel '${channelName}' ============\n`);
	let error_message = null;

	try {
		const client = await helper.getClientForOrg(org_name, username);
		logger.debug(`Successfully got the fabric client for the organization "${org_name}"`);

		const channel = client.getChannel(channelName);
		if (!channel) {
			const message = util.format('Channel %s was not defined in the connection profile', channelName);
			throw new Error(message);
		}

		const tx_id = client.newTransactionID(true); // Admin transaction
		const deployId = tx_id.getTransactionID();

		const request = {
			targets: peers,
			chaincodeId: chaincodeName,
			chaincodeType: chaincodeType,
			chaincodeVersion: chaincodeVersion,
			args: args,
			txId: tx_id,
			'endorsement-policy': {
				identities: [
					{ role: { name: 'member', mspId: 'PESUHospitalBLRMSP' } },
					{ role: { name: 'member', mspId: 'PESUHospitalKPMMSP' } }
				],
				policy: { '2-of': [{ 'signed-by': 0 }, { 'signed-by': 1 }] }
			}
		};

		if (functionName) request.fcn = functionName;

		const results = await channel.sendInstantiateProposal(request, 60000);
		const proposalResponses = results[0];
		const proposal = results[1];

		let all_good = proposalResponses.every(pr =>
			pr && pr.response && pr.response.status === 200
		);

		if (!all_good) {
			error_message = 'Failed to send instantiate Proposal or receive valid response.';
			logger.error(error_message);
		} else {
			logger.info('Successfully sent instantiate Proposal and received valid ProposalResponses');

			const event_hubs = channel.getChannelEventHubsForOrg();
			logger.debug(`Found ${event_hubs.length} event hubs for this organization`);

			const promises = event_hubs.map(eh => new Promise((resolve, reject) => {
				const event_timeout = setTimeout(() => {
					const msg = `REQUEST_TIMEOUT: ${eh.getPeerAddr()}`;
					logger.error(msg);
					eh.disconnect();
					reject(new Error(msg));
				}, 60000);

				eh.registerTxEvent(deployId, (tx, code, block_num) => {
					clearTimeout(event_timeout);
					logger.info(`Transaction ${tx} has status ${code} in block ${block_num}`);
					eh.disconnect();

					if (code !== 'VALID') {
						reject(new Error(`The chaincode instantiate transaction was invalid, code: ${code}`));
					} else {
						resolve(`Chaincode instantiate transaction was committed on peer ${eh.getPeerAddr()}`);
					}
				}, (err) => {
					clearTimeout(event_timeout);
					logger.error('Event error:', err);
					reject(err);
				}, { unregister: true, disconnect: true });

				eh.connect();
			}));

			const orderer_request = {
				txId: tx_id,
				proposalResponses: proposalResponses,
				proposal: proposal
			};

			const sendPromise = channel.sendTransaction(orderer_request);
			promises.push(sendPromise);

			const results = await Promise.all(promises);
			const orderer_response = results.pop();

			if (orderer_response.status !== 'SUCCESS') {
				error_message = `Failed to order the transaction. Error code: ${orderer_response.status}`;
				logger.error(error_message);
			} else {
				logger.info('Successfully sent transaction to the orderer');
			}

			results.forEach((event_result, index) => {
				const peerAddr = event_hubs[index].getPeerAddr();
				if (typeof event_result === 'string') {
					logger.info(`Event hub (${peerAddr}): ${event_result}`);
				} else {
					logger.warn(`Event hub (${peerAddr}) error: ${event_result}`);
					if (!error_message) error_message = event_result.toString();
				}
			});
		}
	} catch (error) {
		logger.error('Failed to instantiate due to error:', error.stack || error);
		error_message = error.toString();
	}

	if (!error_message) {
		const message = util.format(
			'Successfully instantiated chaincode in organization %s on channel \'%s\'',
			org_name, channelName
		);
		logger.info(message);
		return { success: true, message };
	} else {
		const message = util.format('Failed to instantiate chaincode. Cause: %s', error_message);
		logger.error(message);
		throw new Error(message);
	}
};

exports.instantiateChaincode = instantiateChaincode;
