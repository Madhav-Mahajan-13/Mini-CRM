import nodemailer from 'nodemailer';

// Configure the transporter once and export it
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: false, // true for 465, false for other ports
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

/**
 * Sends a personalized campaign email to a single customer.
 * @param {object} customer - The customer object (must have email and name).
 * @param {string} messageTemplate - The campaign's message.
 * @param {string} campaignName - The subject of the email.
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export const sendCampaignEmail = async (customer, messageTemplate, campaignName) => {
    // Simple personalization
    const personalizedMessage = messageTemplate.replace(/\{customer\.name\}/g, customer.name);

    const mailOptions = {
        from: `"${process.env.FROM_NAME || 'Your Company'}" <${process.env.FROM_EMAIL}>`,
        to: customer.email,
        subject: campaignName,
        text: personalizedMessage,
        html: `<p>${personalizedMessage.replace(/\n/g, '<br>')}</p>`,
    };

    try {
        await transporter.sendMail(mailOptions);
        return { success: true };
    } catch (error) {
        console.error(`Failed to send email to ${customer.email}:`, error);
        return { success: false, error: error.message };
    }
};
