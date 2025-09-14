import express from 'express';
import {
    handleGetAllCampaigns,
    handleCreateCampaign,
    handlePreviewAudience
} from './campaign.controller.js';

const router = express.Router();

// Route to get all campaigns
router.get('/', handleGetAllCampaigns);

// Route to create a new campaign and start processing it
router.post('/create', handleCreateCampaign);

// Route to get a preview of the audience size
router.post('/audience-preview', handlePreviewAudience);

export default router;
