import db from "../../dbConnection.js";
import { buildCustomerQuery } from "../utils/query.builder.js";

export const findAllCampaigns = async () => {
    const query = `
        SELECT 
            c.id, c.name, c.created_at,
            c.total_recipients, c.emails_sent, c.emails_failed,
            c.status AS campaign_status
        FROM campaigns c
        ORDER BY c.created_at DESC
    `;
    const result = await db.query(query);

    return result.rows.map(c => ({
        id: c.id,
        name: c.name,
        date: new Date(c.created_at).toISOString().split('T')[0],
        audienceSize: Number(c.total_recipients) || 0,
        sent: Number(c.emails_sent) || 0,
        failed: Number(c.emails_failed) || 0,
    }));
};

export const findCustomersByRules = async (rules) => {
    const { query, params } = buildCustomerQuery(rules, false);
    const result = await db.query(query, params);
    return result.rows;
};

export const countCustomersByRules = async (rules) => {
    const { query, params } = buildCustomerQuery(rules, true);
    const result = await db.query(query, params);
    return parseInt(result.rows[0].count, 10);
};

export const createCampaign = async (campaignData) => {
    const query = `
        INSERT INTO campaigns 
            (name, message_template, rules_json, created_by, total_recipients, status, created_at) 
        VALUES 
            ($1, $2, $3, $4, $5, 'PENDING', NOW()) 
        RETURNING *;
    `;
    const values = [
        campaignData.name,
        campaignData.messageTemplate,
        JSON.stringify(campaignData.rules),
        campaignData.userId,
        campaignData.totalRecipients
    ];
    const result = await db.query(query, values);
    return result.rows[0];
};

export const createCommunicationLogs = async (campaignId, customerIds) => {
    let query = `
        INSERT INTO campaign_customers (campaign_id, customer_id, status, created_at) VALUES 
    `;
    const values = [];
    let paramIndex = 1;

    for (const customerId of customerIds) {
        query += `($${paramIndex++}, $${paramIndex++}, 'PENDING', NOW()),`;
        values.push(campaignId, customerId);
    }

    query = query.slice(0, -1) + ';';
    await db.query(query, values);
};

export const findPendingLogsForCampaign = async (campaignId) => {
    const query = `
        SELECT 
            cl.id, 
            c.id AS customer_id, c.name AS customer_name, c.email AS customer_email,
            cmp.name AS campaign_name, cmp.message_template
        FROM campaign_customers cl
        JOIN customers c ON cl.customer_id = c.id
        JOIN campaigns cmp ON cl.campaign_id = cmp.id
        WHERE cl.campaign_id = $1 AND cl.status = 'PENDING';
    `;
    const result = await db.query(query, [campaignId]);
    
    return result.rows.map(row => ({
        id: row.id,
        customer: { id: row.customer_id, name: row.customer_name, email: row.customer_email },
        campaign: { name: row.campaign_name, message_template: row.message_template }
    }));
};

export const updateLogStatus = async (logId, status, errorMessage) => {
    const query = `
        UPDATE campaign_customers 
        SET status = $1, error_message = $2, sent_at = NOW()
        WHERE id = $3;
    `;
    await db.query(query, [status, errorMessage, logId]);
};

export const updateCampaignStats = async (campaignId, sent, failed) => {
    const query = `
        UPDATE campaigns 
        SET emails_sent = $1, emails_failed = $2, status = 'COMPLETED'
        WHERE id = $3;
    `;
    await db.query(query, [sent, failed, campaignId]);
};

export const updateCampaignStatus = async (campaignId, status) => {
    await db.query('UPDATE campaigns SET status = $1 WHERE id = $2;', [status, campaignId]);
};
