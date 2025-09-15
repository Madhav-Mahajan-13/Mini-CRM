import express from 'express';      
const router = express.Router();

import { 
    getCampaign, 
    createCampaign, 
    previewaudience 
} from "../controllers/campaignController.js";

// All these routes are already protected by authenticateUser middleware in server.js
router.get('/campaigns', getCampaign);
router.post('/campaigns/create', createCampaign);
router.post('/audience-preview', previewaudience);

export default router;