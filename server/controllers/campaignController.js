import db from "../dbConnection.js";
import nodemailer from 'nodemailer'; // For sending emails
// get campaign

export const getCampaign = async (req, res) => {
    try {
        const query = `
            SELECT 
                c.id,
                c.name,
                c.message_template,
                c.rules_json,
                c.total_recipients,
                c.emails_sent,
                c.emails_failed,
                c.status AS campaign_status,
                u.name AS created_by_name,
                u.email AS created_by_email,
                c.created_at
            FROM campaigns c
            JOIN users u ON c.created_by = u.id
            ORDER BY c.created_at DESC
        `;

        const result = await db.query(query);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: "No campaigns found" });
        }

        const campaigns = result.rows.map(c => ({
            id: c.id,
            name: c.name,
            date: c.created_at ? new Date(c.created_at).toISOString().split('T')[0] : null,
            audienceSize: Number(c.total_recipients) || 0,
            sent: Number(c.emails_sent) || 0,
            failed: Number(c.emails_failed) || 0,
            pending: Math.max((Number(c.total_recipients) || 0) 
                               - (Number(c.emails_sent) || 0) 
                               - (Number(c.emails_failed) || 0), 0),
            messageTemplate: c.message_template,
            rules: typeof c.rules_json === 'string' ? JSON.parse(c.rules_json) : c.rules_json,
            createdBy: {
                name: c.created_by_name,
                email: c.created_by_email
            },
            status: c.campaign_status,
            createdAt: c.created_at
        }));

        res.status(200).json({
            campaigns,
            total: campaigns.length
        });

    } catch (error) {
        console.error("Error fetching campaigns:", error);
        res.status(500).json({ message: "Server error while fetching campaigns" });
    }
};




// Configure email transporter (adjust based on your email service)
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: false,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

// Helper function to validate rules
const validateRules = (rules) => {
    const validFields = ['Total Spend', 'Total Visits', 'Last Visit Date'];
    const validOperators = ['>', '<', '='];
    const validLogicOperators = ['AND', 'OR'];

    for (let i = 0; i < rules.length; i++) {
        const rule = rules[i];
        
        // Check if field is valid
        if (!validFields.includes(rule.field)) {
            return { valid: false, message: `Invalid field: ${rule.field}` };
        }
        
        // Check if operator is valid
        if (!validOperators.includes(rule.operator)) {
            return { valid: false, message: `Invalid operator: ${rule.operator}` };
        }
        
        // Check if value exists and is meaningful
        if (!rule.value || rule.value.trim() === '') {
            return { valid: false, message: `Value is required for field: ${rule.field}` };
        }
        
        // Validate value based on field type
        if (rule.field === 'Total Spend' || rule.field === 'Total Visits') {
            const numValue = parseFloat(rule.value);
            if (isNaN(numValue) || numValue < 0) {
                return { valid: false, message: `${rule.field} must be a valid positive number` };
            }
        }
        
        if (rule.field === 'Last Visit Date') {
            const dateValue = new Date(rule.value);
            if (isNaN(dateValue.getTime())) {
                return { valid: false, message: `Last Visit Date must be a valid date` };
            }
        }
        
        // Check logic operator (not needed for last rule)
        if (i < rules.length - 1 && rule.logic && !validLogicOperators.includes(rule.logic)) {
            return { valid: false, message: `Invalid logic operator: ${rule.logic}` };
        }
    }
    
    return { valid: true };
};

// Helper function to build SQL query from rules
const buildCustomerQuery = (rules, countOnly = false) => {
    let baseQuery = countOnly 
        ? 'SELECT COUNT(*) as count FROM customers WHERE '
        : 'SELECT * FROM customers WHERE ';
    
    let conditions = [];
    let params = [];
    let paramCount = 1;
    
    rules.forEach((rule, index) => {
        let condition = '';
        let fieldName = '';
        
        // Map frontend field names to database column names
        switch (rule.field) {
            case 'Total Spend':
                fieldName = 'total_spend';
                break;
            case 'Total Visits':
                fieldName = 'total_visits';
                break;
            case 'Last Visit Date':
                fieldName = 'last_visit';
                break;
            default:
                throw new Error(`Unknown field: ${rule.field}`);
        }
        
        // Build condition based on operator
        switch (rule.operator) {
            case '>':
                condition = `${fieldName} > $${paramCount}`;
                break;
            case '<':
                condition = `${fieldName} < $${paramCount}`;
                break;
            case '=':
                condition = `${fieldName} = $${paramCount}`;
                break;
            default:
                throw new Error(`Unknown operator: ${rule.operator}`);
        }
        
        // Convert value based on field type
        let paramValue = rule.value;
        if (rule.field === 'Total Spend' || rule.field === 'Total Visits') {
            paramValue = parseFloat(rule.value);
        } else if (rule.field === 'Last Visit Date') {
            // For DATE fields, ensure proper format
            paramValue = rule.value; // PostgreSQL will handle date conversion
        }
        
        conditions.push(condition);
        params.push(paramValue);
        paramCount++;
        
        // Add logic operator if not the last rule
        if (index < rules.length - 1 && rule.logic) {
            conditions[conditions.length - 1] += ` ${rule.logic} `;
        }
    });
    
    const query = baseQuery + conditions.join(' ');
    return { query, params };
};

// Helper function to get customers matching the rules
const return_customers = async (rules) => {
    try {
        // Validate rules first
        const validation = validateRules(rules);
        if (!validation.valid) {
            throw new Error(validation.message);
        }
        
        // Build and execute query
        const { query, params } = buildCustomerQuery(rules);
        const result = await db.query(query, params);
        
        return {
            success: true,
            customers: result.rows,
            count: result.rows.length
        };
    } catch (error) {
        return {
            success: false,
            error: error.message,
            customers: [],
            count: 0
        };
    }
};

// Helper function to send email
const sendCampaignEmail = async (customer, messageTemplate, campaignName) => {
    try {
        const mailOptions = {
            from: process.env.FROM_EMAIL || 'noreply@yourcompany.com',
            to: customer.email,
            subject: campaignName,
            text: messageTemplate,
            html: `<p>${messageTemplate.replace(/\n/g, '<br>')}</p>`
        };
        
        await transporter.sendMail(mailOptions);
        return { success: true };
    } catch (error) {
        console.error(`Failed to send email to ${customer.email}:`, error);
        return { success: false, error: error.message };
    }
};

// Preview audience function
export const previewaudience = async (req, res) => {
    try {
        const { rules } = req.body;
        
        if (!rules || !Array.isArray(rules) || rules.length === 0) {
            return res.status(400).json({ message: "Rules are required and must be a non-empty array" });
        }
        
        // Validate rules
        const validation = validateRules(rules);
        if (!validation.valid) {
            return res.status(400).json({ message: validation.message });
        }
        
        // Get count of matching customers
        const { query, params } = buildCustomerQuery(rules, true);
        const result = await db.query(query, params);
        
        const count = parseInt(result.rows[0].count);
        
        res.status(200).json({ 
            count,
            message: `${count} customers match the specified criteria`
        });
        
    } catch (error) {
        console.error("Error in preview audience:", error);
        res.status(500).json({ message: "Server error while previewing audience" });
    }
};

// Create campaign function
export const createCampaign = async (req, res) => {
    const { name, message_template, rules_json } = req.body;
    const userId = 1; // assuming user ID is available in req.user
    // const userId = req.user.id; // assuming user ID is available in req.user

    try {
        // Input validation
        if (!name || !message_template || !rules_json) {
            return res.status(400).json({ message: "Name, message template, and rules are required" });
        }
        
        if (!Array.isArray(rules_json) || rules_json.length === 0) {
            return res.status(400).json({ message: "Rules must be a non-empty array" });
        }
        
        // Verify user exists
        const user = await db.query('SELECT * FROM users WHERE id = $1', [userId]);
        if (user.rows.length === 0) {
            return res.status(404).json({ message: "User not found" });
        }

        // Step 1: Validate rules and get matching customers
        const customerResult = await return_customers(rules_json);
        if (!customerResult.success) {
            return res.status(400).json({ message: customerResult.error });
        }
        
        const { customers } = customerResult;
        
        if (customers.length === 0) {
            return res.status(400).json({ message: "No customers match the specified criteria" });
        }
        
        // Step 2: Create campaign in database
        const campaignQuery = `
            INSERT INTO campaigns (name, message_template, rules_json, created_by, created_at) 
            VALUES ($1, $2, $3, $4, NOW()) 
            RETURNING id
        `;
        const campaignResult = await db.query(campaignQuery, [
            name,
            message_template,
            JSON.stringify(rules_json),
            userId
        ]);
        
        const campaignId = campaignResult.rows[0].id;
        
        // Step 3: Process each customer
        const emailResults = {
            successful: 0,
            failed: 0,
            errors: []
        };
        
        for (const customer of customers) {
            try {
                // Step 4: Add customer to campaign_customers connection table
                const connectionQuery = `
                    INSERT INTO campaign_customers (campaign_id, customer_id, status, created_at) 
                    VALUES ($1, $2, 'PENDING', NOW()) 
                    RETURNING id
                `;
                const connectionResult = await db.query(connectionQuery, [campaignId, customer.id]);
                const connectionId = connectionResult.rows[0].id;
                
                // Step 5: Send email
                const emailResult = await sendCampaignEmail(customer, message_template, name);
                
                // Step 6: Update status based on email result
                const status = emailResult.success ? 'SENT' : 'FAILED';
                const updateQuery = `
                    UPDATE campaign_customers 
                    SET status = $1, sent_at = $2, error_message = $3 
                    WHERE id = $4
                `;
                const sentAt = emailResult.success ? new Date() : null;
                const errorMessage = emailResult.success ? null : emailResult.error;
                
                await db.query(updateQuery, [status, sentAt, errorMessage, connectionId]);
                
                if (emailResult.success) {
                    emailResults.successful++;
                } else {
                    emailResults.failed++;
                    emailResults.errors.push({
                        customerId: customer.id,
                        email: customer.email,
                        error: emailResult.error
                    });
                }
                
            } catch (error) {
                console.error(`Error processing customer ${customer.id}:`, error);
                emailResults.failed++;
                emailResults.errors.push({
                    customerId: customer.id,
                    email: customer.email,
                    error: error.message
                });
            }
        }
        
        // Step 7: Update campaign with final statistics
        const updateCampaignQuery = `
            UPDATE campaigns 
            SET total_recipients = $1, emails_sent = $2, emails_failed = $3, status = 'completed'
            WHERE id = $4
        `;
        await db.query(updateCampaignQuery, [
            customers.length,
            emailResults.successful,
            emailResults.failed,
            campaignId
        ]);
        
        // Return success response
        res.status(201).json({
            message: "Campaign created and processed successfully",
            campaign: {
                id: campaignId,
                name,
                totalCustomers: customers.length,
                emailsSent: emailResults.successful,
                emailsFailed: emailResults.failed
            },
            details: emailResults.failed > 0 ? {
                errors: emailResults.errors.slice(0, 10) // Return first 10 errors
            } : null
        });
        
    } catch (error) {
        console.error("Error creating campaign:", error);
        res.status(500).json({ message: "Server error while creating campaign" });
    }
};
