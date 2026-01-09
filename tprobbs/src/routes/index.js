/**
 * TPro BBS Route Aggregator
 */

const express = require('express');
const router = express.Router();

const authRoutes = require('./auth');
const mainRoutes = require('./main');
const boardsRoutes = require('./boards');
const emailRoutes = require('./email');

// Auth routes at root level
router.use('/', authRoutes);

// Main menu routes
router.use('/main', mainRoutes);

// Communication routes
router.use('/boards', boardsRoutes);
router.use('/email', emailRoutes);

module.exports = router;
