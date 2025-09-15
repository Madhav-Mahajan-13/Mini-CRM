import db from "../dbConnection.js";
// import nodemailer from 'nodemailer';
import { transporter } from "../utils/emailservice.js";
import { sendCampaignEmail } from "../utils/emailservice.js";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { checkCircuitBreaker, recordAIFailure,recordAISuccess,retryWithBackoff } from "../utils/aiHelperFuntions.js";
import { validateRules, buildCustomerQuery, getMatchingCustomers } from "../utils/helperFunctionRules.js";
import { generateRulesFallback } from "../utils/prompthelper.js";
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);




// Get campaigns with enhanced error handling and pagination
export const getCampaign = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;

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
            LIMIT $1 OFFSET $2
        `;

        const countQuery = 'SELECT COUNT(*) as total FROM campaigns';
        
        const [result, countResult] = await Promise.all([
            db.query(query, [limit, offset]),
            db.query(countQuery)
        ]);

        const totalCampaigns = parseInt(countResult.rows[0].total);
        const totalPages = Math.ceil(totalCampaigns / limit);

        if (result.rows.length === 0 && page === 1) {
            return res.status(200).json({ 
                campaigns: [], 
                total: 0,
                page: 1,
                totalPages: 0,
                message: "No campaigns found"
            });
        }

        const campaigns = result.rows.map(c => ({
            id: c.id,
            name: c.name,
            date: c.created_at ? new Date(c.created_at).toLocaleDateString('en-IN') : null,
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
            status: c.campaign_status || 'completed',
            createdAt: c.created_at
        }));

        res.status(200).json({
            campaigns,
            total: totalCampaigns,
            page,
            totalPages,
            hasMore: page < totalPages
        });

    } catch (error) {
        console.error("Error fetching campaigns:", error);
        res.status(500).json({ 
            message: "Server error while fetching campaigns",
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// Preview audience function with enhanced validation
export const previewaudience = async (req, res) => {
    try {
        const { rules } = req.body;
        
        if (!rules || !Array.isArray(rules) || rules.length === 0) {
            return res.status(400).json({ 
                message: "Rules are required and must be a non-empty array",
                example: [{"field": "Total Spend", "operator": ">", "value": "1000", "logic": null}]
            });
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
            message: `${count.toLocaleString('en-IN')} customers match the specified criteria`,
            rules: rules // Echo back the rules for confirmation
        });
        
    } catch (error) {
        console.error("Error in preview audience:", error);
        res.status(500).json({ 
            message: "Server error while previewing audience",
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// Create campaign function with comprehensive error handling
export const createCampaign = async (req, res) => {
    const { name, message_template, rules_json } = req.body;
    const userId = req.user.id;

    try {
        // Input validation
        if (!name || name.trim().length < 3) {
            return res.status(400).json({ message: "Campaign name must be at least 3 characters long" });
        }
        
        if (!message_template || message_template.trim().length < 10) {
            return res.status(400).json({ message: "Campaign message must be at least 10 characters long" });
        }
        
        if (!rules_json || !Array.isArray(rules_json) || rules_json.length === 0) {
            return res.status(400).json({ message: "Rules must be a non-empty array" });
        }
        
        // Verify user exists
        const user = await db.query('SELECT * FROM users WHERE id = $1', [userId]);
        if (user.rows.length === 0) {
            return res.status(404).json({ message: "User not found" });
        }

        // Validate rules and get matching customers
        const customerResult = await getMatchingCustomers(rules_json);
        if (!customerResult.success) {
            return res.status(400).json({ message: customerResult.error });
        }
        
        const { customers } = customerResult;
        
        if (customers.length === 0) {
            return res.status(400).json({ 
                message: "No customers match the specified criteria. Please adjust your rules and try again." 
            });
        }

        // Check if too many customers (optional limit)
        const MAX_RECIPIENTS = parseInt(process.env.MAX_CAMPAIGN_RECIPIENTS) || 10000;
        if (customers.length > MAX_RECIPIENTS) {
            return res.status(400).json({ 
                message: `Campaign audience too large (${customers.length.toLocaleString('en-IN')} customers). Maximum allowed is ${MAX_RECIPIENTS.toLocaleString('en-IN')} recipients.`
            });
        }
        
        // Create campaign in database
        const campaignQuery = `
            INSERT INTO campaigns (name, message_template, rules_json, created_by, created_at, status, total_recipients) 
            VALUES ($1, $2, $3, $4, NOW(), 'processing', $5) 
            RETURNING id
        `;
        const campaignResult = await db.query(campaignQuery, [
            name.trim(),
            message_template.trim(),
            JSON.stringify(rules_json),
            userId,
            customers.length
        ]);
        
        const campaignId = campaignResult.rows[0].id;
        console.log(`Created campaign ${campaignId} for ${customers.length} customers`);
        
        // Process customers in batches to avoid overwhelming the email service
        const BATCH_SIZE = 10;
        const emailResults = {
            successful: 0,
            failed: 0,
            errors: []
        };
        
        for (let i = 0; i < customers.length; i += BATCH_SIZE) {
            const batch = customers.slice(i, i + BATCH_SIZE);
            const batchPromises = batch.map(async (customer) => {
                try {
                    // Add customer to campaign_customers table
                    const connectionQuery = `
                        INSERT INTO campaign_customers (campaign_id, customer_id, status, created_at) 
                        VALUES ($1, $2, 'PENDING', NOW()) 
                        RETURNING id
                    `;
                    const connectionResult = await db.query(connectionQuery, [campaignId, customer.id]);
                    const connectionId = connectionResult.rows[0].id;
                    
                    // Send email
                    const emailResult = await sendCampaignEmail(customer, message_template.trim(), name.trim());
                    
                    // Update status
                    const status = emailResult.success ? 'SENT' : 'FAILED';
                    const updateQuery = `
                        UPDATE campaign_customers 
                        SET status = $1, sent_at = $2, error_message = $3 
                        WHERE id = $4
                    `;
                    const sentAt = emailResult.success ? new Date() : null;
                    const errorMessage = emailResult.success ? null : emailResult.error;
                    
                    await db.query(updateQuery, [status, sentAt, errorMessage, connectionId]);
                    
                    return {
                        customerId: customer.id,
                        email: customer.email,
                        success: emailResult.success,
                        error: emailResult.error
                    };
                } catch (error) {
                    console.error(`Error processing customer ${customer.id}:`, error);
                    return {
                        customerId: customer.id,
                        email: customer.email,
                        success: false,
                        error: error.message
                    };
                }
            });
            
            const batchResults = await Promise.all(batchPromises);
            
            batchResults.forEach(result => {
                if (result.success) {
                    emailResults.successful++;
                } else {
                    emailResults.failed++;
                    emailResults.errors.push({
                        customerId: result.customerId,
                        email: result.email,
                        error: result.error
                    });
                }
            });
            
            // Small delay between batches
            if (i + BATCH_SIZE < customers.length) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }
        
        // Update campaign with final statistics
        const finalStatus = emailResults.failed === 0 ? 'completed' : 
                          emailResults.successful === 0 ? 'failed' : 'partially_completed';
        
        const updateCampaignQuery = `
            UPDATE campaigns 
            SET emails_sent = $1, emails_failed = $2, status = $3
            WHERE id = $4
        `;
        await db.query(updateCampaignQuery, [
            emailResults.successful,
            emailResults.failed,
            finalStatus,
            campaignId
        ]);
        
        console.log(`Campaign ${campaignId} completed: ${emailResults.successful} sent, ${emailResults.failed} failed`);
        
        // Return success response
        res.status(201).json({
            success: true,
            message: "Campaign created and processed successfully",
            campaign: {
                id: campaignId,
                name: name.trim(),
                totalCustomers: customers.length,
                emailsSent: emailResults.successful,
                emailsFailed: emailResults.failed,
                status: finalStatus
            },
            details: emailResults.failed > 0 ? {
                failureRate: ((emailResults.failed / customers.length) * 100).toFixed(1) + '%',
                sampleErrors: emailResults.errors.slice(0, 5) // Return first 5 errors
            } : null
        });
        
    } catch (error) {
        console.error("Error creating campaign:", error);
        
        // Try to update campaign status to failed if campaign was created
        if (error.campaignId) {
            try {
                await db.query(
                    'UPDATE campaigns SET status = $1, completed_at = NOW() WHERE id = $2',
                    ['failed', error.campaignId]
                );
            } catch (updateError) {
                console.error('Failed to update campaign status:', updateError);
            }
        }
        
        res.status(500).json({ 
            message: "Server error while creating campaign",
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// Enhanced preview from prompt with comprehensive AI handling
export const previewFromPrompt = async (req, res) => {
    const { prompt } = req.body;

    if (!prompt || prompt.trim().length < 5) {
        return res.status(400).json({ 
            message: 'Prompt must be at least 5 characters long',
            examples: [
                'Customers who spent over ₹5000',
                'Users who visited more than 3 times and spent over $1000',
                'Customers who haven\'t visited in 6 months'
            ]
        });
    }

    try {
        let parsedRules = null;
        let method = 'fallback'; // Default to fallback
        
        // Check circuit breaker before attempting AI
        if (checkCircuitBreaker() && process.env.GEMINI_API_KEY) {
            try {
                const aiCall = async () => {
                    const modelName = process.env.GEMINI_MODEL || 'gemini-1.5-flash-latest';
                    const model = genAI.getGenerativeModel({ 
                        model: modelName,
                        generationConfig: {
                            temperature: 0.1,
                            maxOutputTokens: 2000,
                            topP: 0.95,
                            topK: 40,
                        }
                    });
                    
                    const today = new Date().toISOString().split('T')[0];
                    const instruction = `
You are an expert system that converts natural language queries into JSON arrays of rule objects for a CRM system.

**CRITICAL REQUIREMENTS:**
1. Output ONLY a valid JSON array. No explanations, no markdown, no additional text.
2. Each rule object must have exactly these 4 properties: "field", "operator", "value", "logic"
3. "field" must be EXACTLY one of: ["Total Spend", "Total Visits", "Last Visit Date"]
4. "operator" must be EXACTLY one of: [">", "<", "="]  
5. "value" must be a string (numbers as strings, dates as YYYY-MM-DD)
6. "logic" must be "AND", "OR", or null (null for the last rule only)
7. For relative dates, calculate from today: ${today}
8. Remove currency symbols (₹, $) and convert to plain numbers
9. Handle common variations (spent/spend, visited/visits, etc.)

**Examples:**
Input: "Customers who spent over ₹5000"
Output: [{"field": "Total Spend", "operator": ">", "value": "5000", "logic": null}]

Input: "Users with more than 3 visits and spent over $1000"  
Output: [{"field": "Total Visits", "operator": ">", "value": "3", "logic": "AND"}, {"field": "Total Spend", "operator": ">", "value": "1000", "logic": null}]

Input: "Customers who haven't visited in 3 months"
Output: [{"field": "Last Visit Date", "operator": "<", "value": "${new Date(new Date().setMonth(new Date().getMonth() - 3)).toISOString().split('T')[0]}", "logic": null}]

Now convert this prompt: "${prompt.trim()}"
                    `;
                    
                    const result = await model.generateContent(instruction);
                    const response = await result.response;
                    let text = response.text();
                    
                    // ✅ START OF COMPLETED CODE
                    
                    // Clean up potential markdown and extraneous text from the AI response
                    text = text.replace(/```json/g, '').replace(/```/g, '').trim();

                    // Attempt to parse the cleaned text into a JSON object
                    const generatedRules = JSON.parse(text);

                    // Validate the structure of the AI-generated rules
                    const validation = validateRules(generatedRules);
                    if (!validation.valid) {
                        // If validation fails, throw an error to trigger the fallback
                        throw new Error(`AI generated invalid rules: ${validation.message}`);
                    }
                    
                    // If everything is successful, update the state
                    parsedRules = generatedRules;
                    method = 'ai';
                    recordAISuccess(); // Reset the circuit breaker on success
                };

                // Execute the AI call with retry logic
                await retryWithBackoff(aiCall);

            } catch (aiError) {
                console.error("AI service call failed after retries:", aiError.message);
                recordAIFailure(); // Record the failure for the circuit breaker
                // Let the code proceed to the fallback mechanism
            }
        } else {
            if (aiServiceState.isCircuitOpen) {
                console.log('AI service skipped: Circuit breaker is open.');
            }
        }

        // If AI failed or was skipped, use the fallback
        if (!parsedRules) {
            parsedRules = generateRulesFallback(prompt);
            method = 'fallback';
        }

        // If even the fallback fails to produce rules, it's a bad request
        if (!parsedRules || parsedRules.length === 0) {
            return res.status(400).json({ 
                message: "Could not understand the prompt. Please try rephrasing.",
                prompt
            });
        }
        
        // --- Final Step: Calculate audience size using the generated rules ---
        const { query, params } = buildCustomerQuery(parsedRules, true); // countOnly = true
        const countResult = await db.query(query, params);
        const audienceCount = parseInt(countResult.rows[0].count, 10);

        // --- Send the final successful response ---
        res.status(200).json({
            count: audienceCount,
            rules: parsedRules,
            method, // 'ai' or 'fallback'
            message: `${audienceCount.toLocaleString('en-IN')} customers match the criteria.`
        });

    } catch (error) {
        console.error("Critical error in previewFromPrompt:", error);
        res.status(500).json({ 
            message: "A server error occurred while processing the prompt.",
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};
