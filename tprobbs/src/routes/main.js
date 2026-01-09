/**
 * TPro BBS Main Menu Routes
 */

const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');

// Main menu
router.get('/', requireAuth, (req, res) => {
    const db = req.app.get('tprodb');

    // Count unread emails
    const unreadMail = db.prepare(
        'SELECT COUNT(*) as count FROM emails WHERE to_id = ? AND read = 0'
    ).get(req.user.id).count;

    res.render('pages/main', {
        title: 'Main Menu',
        user: req.user,
        unreadMail
    });
});

// User settings
router.get('/settings', requireAuth, (req, res) => {
    res.render('pages/settings', {
        title: 'User Settings',
        user: req.user
    });
});

// Members list
router.get('/members', requireAuth, (req, res) => {
    const db = req.app.get('tprodb');
    const page = parseInt(req.query.page, 10) || 1;
    const limit = 25;
    const offset = (page - 1) * limit;

    const total = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
    const members = db.prepare(`
        SELECT u.id, u.username, u.level, u.class, c.name as class_name,
               u.status, u.kills, u.killed, u.last_on
        FROM users u
        LEFT JOIN classes c ON u.class = c.id
        ORDER BY u.level DESC, u.experience DESC
        LIMIT ? OFFSET ?
    `).all(limit, offset);

    res.render('pages/members', {
        title: 'Members List',
        user: req.user,
        members,
        page,
        totalPages: Math.ceil(total / limit)
    });
});

module.exports = router;
