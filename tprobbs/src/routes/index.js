/**
 * TPro BBS Route Aggregator
 */

const express = require('express');
const router = express.Router();

const authRoutes = require('./auth');
const mainRoutes = require('./main');

// Auth routes at root level
router.use('/', authRoutes);

// Main menu routes
router.use('/main', mainRoutes);

module.exports = router;
