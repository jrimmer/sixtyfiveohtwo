/**
 * TPro BBS Route Aggregator
 */

const express = require('express');
const router = express.Router();

const authRoutes = require('./auth');
const mainRoutes = require('./main');
const boardsRoutes = require('./boards');
const emailRoutes = require('./email');
const combatRoutes = require('./combat');
const gamesRoutes = require('./games');
const storesRoutes = require('./stores');
const gangsRoutes = require('./gangs');

// Auth routes at root level
router.use('/', authRoutes);

// Main menu routes
router.use('/main', mainRoutes);

// Communication routes
router.use('/boards', boardsRoutes);
router.use('/email', emailRoutes);

// Combat routes
router.use('/combat', combatRoutes);

// Games routes
router.use('/games', gamesRoutes);

// Stores routes
router.use('/stores', storesRoutes);

// Gangs routes
router.use('/gangs', gangsRoutes);

module.exports = router;
