// const express = require('express');
import express from 'express';
const router = express.Router();
const sampleController = require('../controllers/sampleController');
const sampleMiddleware = require('../middleware/sampleMiddleware');

router.get('/hello', sampleMiddleware, sampleController.sayHello);

module.exports = router;
