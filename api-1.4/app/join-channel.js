/**
 * Copyright 2017 IBM All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the 'License');
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an 'AS IS' BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

'use strict';

const util = require('util');
const helper = require('./helper.js');
const logger = helper.getLogger('join-channel');

/*
 * Have an organization join a channel
 */
const joinChannel = async function(channel_name, peers, username, org_name) {
	logger.debug('\n\n============ Join Channel start ============\n');
	let error_message = null;

	try {
		logger.info('Calling peers in organization "%s" to join the channel', org_name);

		// Set up the client for this org
		const client = await helper.getClientForOrg(org_name, username);
		logger.debug('Successfully got the fabric client for the organization "%s"', org_name);

		const channel = client.getChannel(channel_name);
		if (!channel) {
			const message = util.format('Channel %s was not defined in the connection profile', channel_name);
			logger.error(message);
			throw new Error(message);
		}

		// Get the genesis block from the orderer
		const request = {
			txId: client.newTransactionID(true) // admin transaction ID
		};
		const genesis_block = await channel.getGenesisBlock(request);

		// Wait a bit before attempting to join the channel
		const promises = [];
		promises.push(new Promise(resolve => setTimeout(resolve, 10000)));

		const join_request = {
			targets: peers,
			txId: client.newTransactionID(true),
			block: genesis_block
		};
		const join_promise = channel.joinChannel(join_request);
		promises.push(join_promise);

		const results = await Promise.all(promises);
		logger.debug(util.format('Join Channel R E S P O N S E : %j', results));

		const peers_results = results.pop();
		for (let i in peers_results) {
			const peer_result = peers_results[i];
			if (peer_result.response && peer_result.response.status === 200) {
				logger.info('Successfully joined peer to the channel %s', channel_name);
			} else {
				const message = util.format('Failed to join peer to the channel %s', channel_name);
				error_message = message;
				logger.error(message);
			}
		}
	} catch (error) {
		const message = 'Failed to join channel due to error: ' + (error.stack ? error.stack : error.toString());
		logger.error(message);
		error_message = message;
	}

	if (!error_message) {
		const message = util.format(
			'Successfully joined peers in organization %s to the channel: %s',
			org_name, channel_name);
		logger.info(message);
		return {
			success: true,
			message: message
		};
	} else {
		const message = util.format('Failed to join all peers to channel. cause: %s', error_message);
		logger.error(message);
		throw new Error(message);
	}
};

exports.joinChannel = joinChannel;
