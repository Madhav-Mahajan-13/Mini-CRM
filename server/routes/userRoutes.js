import express from 'express';      
const router = express.Router();

import { 
    getCampaign, 
    createCampaign, 
    previewaudience 
} from "../controllers/campaignController.js";

// to get all campaigns
router.get('/campaigns', getCampaign);

// campaign creation and audience preview
router.post('/campaigns/create', createCampaign);
router.post('/audience-preview', previewaudience);

export default router;