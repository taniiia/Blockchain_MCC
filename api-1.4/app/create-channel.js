'use strict';

const fs = require('fs');
const path = require('path');
const helper = require('./helper.js');
const logger = helper.getLogger('Create-Channel');

/**
 * Create a channel using the specified channel config
 * @param {string} channelName - Name of the channel to create
 * @param {string} channelConfigPath - Path to the channel.tx file
 * @param {string} username - Admin username (e.g., 'admin')
 * @param {string} orgName - Organization name (e.g., 'PESUHospitalBLR')
 */
const createChannel = async (channelName, channelConfigPath, username, orgName) => {
    logger.debug(`\n====== Creating Channel '${channelName}' ======\n`);
    try {
        // Initialize the client for the org
        const client = await helper.getClientForOrg(orgName, username);
        logger.debug(`Successfully got the fabric client for the organization "${orgName}"`);

        // Read the channel config tx file
        const envelopePath = path.resolve(__dirname, channelConfigPath);
        const envelope = fs.readFileSync(envelopePath);
        const channelConfig = client.extractChannelConfig(envelope);

        // Sign the config using the admin identity
        const signature = client.signChannelConfig(channelConfig);

        const txId = client.newTransactionID(true); // admin transaction
        const request = {
            config: channelConfig,
            signatures: [signature],
            name: channelName,
            orderer: client.getOrderer(), // OPTIONAL: if using custom orderer
            txId
        };

        // Send the createChannel request
        const response = await client.createChannel(request);
        logger.debug('Response :: %j', response);

        if (response && response.status === 'SUCCESS') {
            logger.info(`Successfully created the channel '${channelName}'`);
            return {
                success: true,
                message: `Channel '${channelName}' created successfully`
            };
        } else {
            logger.error(`Failed to create the channel '${channelName}'`);
            throw new Error(`Failed to create the channel '${channelName}'`);
        }
    } catch (err) {
        logger.error('Failed to initialize the channel:', err.stack || err);
        throw new Error(`Failed to initialize the channel: ${err.message}`);
    }
};

module.exports = {
    createChannel
};
