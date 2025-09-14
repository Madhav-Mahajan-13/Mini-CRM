import * as CampaignRepository from './campaign.repository.js';
import * as EmailService from '../services/email.service.js';
import { buildCustomerQuery, validateRules } from '../utils/query.builder.js';

/**
 * Business logic to retrieve and format all campaigns.
 */
export const getAllCampaigns = async () => {
    const campaigns = await CampaignRepository.findAllCampaigns();
    if (!campaigns || campaigns.length === 0) {
        return { campaigns: [], total: 0 };
    }
    // You can add any extra formatting logic here if needed
    return { campaigns, total: campaigns.length };
};

/**
 * Business logic to calculate the audience size for a given set of rules.
 */
export const getAudienceCount = async (rules) => {
    const validation = validateRules(rules);
    if (!validation.valid) {
        const error = new Error(validation.message);
        error.statusCode = 400;
        throw error;
    }
    return await CampaignRepository.countCustomersByRules(rules);
};

/**
 * Creates a campaign, finds the audience, and queues it for background processing.
 * This function returns quickly, it does not wait for emails to be sent.
 */
export const createAndQueueCampaign = async (name, messageTemplate, rules, userId) => {
    const validation = validateRules(rules);
    if (!validation.valid) {
        const error = new Error(validation.message);
        error.statusCode = 400;
        throw error;
    }

    const customers = await CampaignRepository.findCustomersByRules(rules);
    if (customers.length === 0) {
        const error = new Error("No customers match the specified criteria.");
        error.statusCode = 404;
        throw error;
    }

    // 1. Create the main campaign record with a 'pending' status
    const campaign = await CampaignRepository.createCampaign({
        name,
        messageTemplate,
        rules,
        userId,
        totalRecipients: customers.length,
    });

    // 2. Create all the log entries for each customer
    await CampaignRepository.createCommunicationLogs(campaign.id, customers.map(c => c.id));

    // 3. IMPORTANT: Start the processing in the background.
    // We call the processor but DO NOT wait for it to finish.
    processCampaignInBackground(campaign.id);

    return campaign;
};

/**
 * This function runs in the background and does the heavy work of sending emails.
 * In a real-world scenario, this would be triggered by a message queue (like RabbitMQ or Kafka).
 * Here, we simulate it with an async call that the controller doesn't `await`.
 * @param {number} campaignId
 */
const processCampaignInBackground = async (campaignId) => {
    console.log(`Starting background processing for campaign ID: ${campaignId}`);
    try {
        const logs = await CampaignRepository.findPendingLogsForCampaign(campaignId);
        let successfulSends = 0;
        let failedSends = 0;

        for (const log of logs) {
            const emailResult = await EmailService.sendCampaignEmail(
                log.customer,
                log.campaign.message_template,
                log.campaign.name
            );

            if (emailResult.success) {
                successfulSends++;
                await CampaignRepository.updateLogStatus(log.id, 'SENT', null);
            } else {
                failedSends++;
                await CampaignRepository.updateLogStatus(log.id, 'FAILED', emailResult.error);
            }
        }

        // Finally, update the main campaign with the final stats
        await CampaignRepository.updateCampaignStats(campaignId, successfulSends, failedSends);

        console.log(`Finished processing campaign ID: ${campaignId}. Sent: ${successfulSends}, Failed: ${failedSends}`);

    } catch (error) {
        console.error(`Error processing campaign ${campaignId} in background:`, error);
        // Optionally update the campaign status to 'failed_processing'
        await CampaignRepository.updateCampaignStatus(campaignId, 'FAILED');
    }
};
