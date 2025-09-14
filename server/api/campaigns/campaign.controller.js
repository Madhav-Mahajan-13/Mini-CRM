import * as CampaignService from './campaign.service.js';

/**
 * Controller to handle fetching all campaigns.
 */
export const handleGetAllCampaigns = async (req, res) => {
    try {
        const result = await CampaignService.getAllCampaigns();
        res.status(200).json(result);
    } catch (error) {
        console.error("Controller error fetching campaigns:", error);
        res.status(500).json({ message: error.message || "Server error" });
    }
};

/**
 * Controller to handle the creation of a new campaign.
 * It immediately responds to the user and lets the campaign process in the background.
 */
export const handleCreateCampaign = async (req, res) => {
    try {
        const { name, message_template, rules_json } = req.body;
        const userId = 1; // Placeholder for authenticated user ID

        if (!name || !message_template || !rules_json) {
            return res.status(400).json({ message: "Name, message template, and rules are required" });
        }

        // The service layer handles the complex logic
        const result = await CampaignService.createAndQueueCampaign(name, message_template, rules_json, userId);

        // Respond immediately to the user
        res.status(202).json({
            message: "Campaign accepted and is now being processed.",
            campaign: result
        });

    } catch (error) {
        console.error("Controller error creating campaign:", error);
        res.status(error.statusCode || 500).json({ message: error.message || "Server error" });
    }
};

/**
 * Controller to handle previewing the audience size for a given set of rules.
 */
export const handlePreviewAudience = async (req, res) => {
    try {
        const { rules } = req.body;
        if (!rules || !Array.isArray(rules) || rules.length === 0) {
            return res.status(400).json({ message: "Rules are required" });
        }

        const count = await CampaignService.getAudienceCount(rules);

        res.status(200).json({
            count,
            message: `${count} customers match the specified criteria`
        });

    } catch (error) {
        console.error("Controller error previewing audience:", error);
        res.status(error.statusCode || 500).json({ message: error.message || "Server error" });
    }
};
