import nodemailer from "nodemailer";

// Configure email transporter
export const transporter = nodemailer.createTransport({
    service: "Gmail",
    host: "smtp.gmail.com",
    port: 465,
    secure: process.env.production == true,
    auth: {
        user: process.env.sender_email,
        pass: process.env.sender_pass,
    },
});

// Helper function to send email with retry logic
export const sendCampaignEmail = async (customer, messageTemplate, campaignName, retries = 2) => {
    for (let attempt = 1; attempt <= retries + 1; attempt++) {
        try {
            const mailOptions = {
                from: process.env.sender_email || 'noreply@yourcompany.com',
                to: customer.email,
                subject: campaignName,
                text: messageTemplate,
                html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #333;">${campaignName}</h2>
                    <p style="line-height: 1.6; color: #666;">${messageTemplate.replace(/\n/g, '<br>')}</p>
                </div>`
            };
            
            const info = await transporter.sendMail(mailOptions);
            console.log(`Email sent to ${customer.email}: ${info.messageId}`);
            return { success: true, messageId: info.messageId };
        } catch (error) {
            console.error(`Email attempt ${attempt} failed for ${customer.email}:`, error.message);
            
            if (attempt === retries + 1) {
                return { success: false, error: error.message };
            }
            
            // Wait before retry
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
    }
};