// import express form 'express';\
import express from 'express';      
const router = express.Router();

import { getCampaign } from "../controllers/campaignController.js";

router.get('/campaigns', getCampaign);


export default router;