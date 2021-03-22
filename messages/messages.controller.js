const express = require('express');
const router = express.Router();
const Joi = require('joi');
const validateRequest = require('_middleware/validate-request');
const authorize = require('_middleware/authorize');
const messageService = require('./messages.service');

// Routes
router.get('/getmsghistory', authorize(), getMsgHistory)

module.exports = router;

// API Functions