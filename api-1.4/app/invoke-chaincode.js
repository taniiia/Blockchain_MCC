'use strict';

const util = require('util');
const helper = require('./helper.js');
const logger = helper.getLogger('invoke-chaincode');

async function invokeChaincode(peerNames, channelName, chaincodeName, fcn, args, username, org_name) {
  logger.debug(util.format('Invoking transaction on channel %s', channelName));
  let error_message = null;
  let tx_id_string = null;

  try {
    const client = await helper.getClientForOrg(org_name, username);
    logger.debug('Obtained fabric client for org: %s', org_name);
    const channel = client.getChannel(channelName);
    if (!channel) {
      throw new Error(util.format('Channel %s not defined in connection profile', channelName));
    }
    const tx_id = client.newTransactionID();
    tx_id_string = tx_id.getTransactionID();
    logger.debug("Number of arguments: %s", args.length);

    const request = {
      targets: peerNames,
      chaincodeId: chaincodeName,
      fcn: fcn,
      args: args,
      chainId: channelName,
      txId: tx_id
    };

    const results = await channel.sendTransactionProposal(request);
    const proposalResponses = results[0];
    const proposal = results[1];

    let all_good = true;
    for (let response of proposalResponses) {
      if (response && response.response && response.response.status === 200) {
        logger.info('Proposal response OK');
      } else {
        logger.error('Proposal response BAD');
        all_good = false;
      }
    }
    if (!all_good) {
      throw new Error('Not all proposal responses were good');
    }

    // Set up event listeners.
    const promises = [];
    const event_hubs = channel.getChannelEventHubsForOrg();
    event_hubs.forEach(eh => {
      let invokeEventPromise = new Promise((resolve, reject) => {
        let event_timeout = setTimeout(() => {
          reject(new Error('REQUEST_TIMEOUT:' + eh.getPeerAddr()));
          eh.disconnect();
        }, 50000);
        eh.registerTxEvent(tx_id_string, (tx, code, blockNum) => {
          clearTimeout(event_timeout);
          if (code !== 'VALID') {
            reject(new Error(util.format('Transaction invalid, code:%s', code)));
          } else {
            resolve('Transaction valid');
          }
        }, err => {
          clearTimeout(event_timeout);
          reject(err);
        }, { unregister: true, disconnect: true });
        eh.connect();
      });
      promises.push(invokeEventPromise);
    });

    const ordererRequest = {
      txId: tx_id,
      proposalResponses: proposalResponses,
      proposal: proposal
    };
    const sendPromise = channel.sendTransaction(ordererRequest);
    promises.push(sendPromise);

    const resultsAll = await Promise.all(promises);
    let ordererResult = resultsAll.pop();
    if (ordererResult.status !== 'SUCCESS') {
      error_message = util.format('Failed to order transaction. Error code: %s', ordererResult.status);
      throw new Error(error_message);
    }
  } catch (error) {
    logger.error('Error in invokeChaincode: ' + (error.stack || error));
    error_message = error.toString();
    throw new Error(util.format('Failed to invoke chaincode. Cause: %s', error_message));
  }
  return { tx_id: tx_id_string };
}
 
module.exports = { invokeChaincode };
