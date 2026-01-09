/**
 * TPro BBS Gangs Routes
 */

const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');

// Gangs list
router.get('/', requireAuth, (req, res) => {
    const db = req.app.get('tprodb');

    const gangs = db.prepare(`
        SELECT g.*,
               l.username as leader_name,
               (SELECT COUNT(*) FROM users WHERE gang_id = g.id) as member_count
        FROM gangs g
        LEFT JOIN users l ON g.leader_id = l.id
        WHERE g.active = 1
        ORDER BY g.gold DESC
    `).all();

    // Get user's gang if any
    const userGang = req.user.gang_id
        ? db.prepare('SELECT * FROM gangs WHERE id = ?').get(req.user.gang_id)
        : null;

    // Get pending invites
    const pendingInvites = db.prepare(`
        SELECT g.*, u.username as leader_name
        FROM gangs g
        LEFT JOIN users u ON g.leader_id = u.id
        WHERE (g.member2_id = ? AND g.member2_accepted = 0)
           OR (g.member3_id = ? AND g.member3_accepted = 0)
           OR (g.member4_id = ? AND g.member4_accepted = 0)
    `).all(req.user.id, req.user.id, req.user.id);

    res.render('pages/gangs/list', {
        title: 'Gangs',
        user: req.user,
        gangs,
        userGang,
        pendingInvites,
        message: req.query.message || null
    });
});

// Create gang form
router.get('/create', requireAuth, (req, res) => {
    if (req.user.gang_id) {
        return res.redirect('/tprobbs/gangs?message=You are already in a gang');
    }

    const db = req.app.get('tprodb');

    // Get eligible users (not in a gang)
    const eligibleUsers = db.prepare(`
        SELECT id, username, level, class
        FROM users
        WHERE id != ? AND gang_id IS NULL AND status = 1
        ORDER BY level DESC
        LIMIT 50
    `).all(req.user.id);

    res.render('pages/gangs/create', {
        title: 'Create Gang',
        user: req.user,
        eligibleUsers,
        error: null
    });
});

// Create gang
router.post('/create', requireAuth, (req, res) => {
    if (req.user.gang_id) {
        return res.redirect('/tprobbs/gangs?message=You are already in a gang');
    }

    const db = req.app.get('tprodb');
    const { name, member2, member3, member4 } = req.body;

    if (!name || name.length < 3 || name.length > 25) {
        const eligibleUsers = db.prepare(`
            SELECT id, username, level FROM users
            WHERE id != ? AND gang_id IS NULL AND status = 1
            ORDER BY level DESC LIMIT 50
        `).all(req.user.id);

        return res.render('pages/gangs/create', {
            title: 'Create Gang',
            user: req.user,
            eligibleUsers,
            error: 'Gang name must be 3-25 characters'
        });
    }

    // Check if name exists
    const existing = db.prepare('SELECT id FROM gangs WHERE name = ?').get(name);
    if (existing) {
        const eligibleUsers = db.prepare(`
            SELECT id, username, level FROM users
            WHERE id != ? AND gang_id IS NULL AND status = 1
            ORDER BY level DESC LIMIT 50
        `).all(req.user.id);

        return res.render('pages/gangs/create', {
            title: 'Create Gang',
            user: req.user,
            eligibleUsers,
            error: 'Gang name already exists'
        });
    }

    // Create gang
    const result = db.prepare(`
        INSERT INTO gangs (name, leader_id, member2_id, member3_id, member4_id)
        VALUES (?, ?, ?, ?, ?)
    `).run(
        name,
        req.user.id,
        member2 ? parseInt(member2, 10) : null,
        member3 ? parseInt(member3, 10) : null,
        member4 ? parseInt(member4, 10) : null
    );

    // Set leader's gang
    db.prepare('UPDATE users SET gang_id = ? WHERE id = ?')
        .run(result.lastInsertRowid, req.user.id);

    res.redirect('/tprobbs/gangs?message=Gang created! Waiting for members to accept.');
});

// Accept invite
router.post('/accept/:gangId', requireAuth, (req, res) => {
    const db = req.app.get('tprodb');
    const gangId = parseInt(req.params.gangId, 10);

    const gang = db.prepare('SELECT * FROM gangs WHERE id = ?').get(gangId);
    if (!gang) {
        return res.redirect('/tprobbs/gangs?message=Gang not found');
    }

    // Check which member slot
    let slot = null;
    if (gang.member2_id === req.user.id) slot = 'member2_accepted';
    else if (gang.member3_id === req.user.id) slot = 'member3_accepted';
    else if (gang.member4_id === req.user.id) slot = 'member4_accepted';

    if (!slot) {
        return res.redirect('/tprobbs/gangs?message=You were not invited to this gang');
    }

    // Accept invite
    db.prepare(`UPDATE gangs SET ${slot} = 1 WHERE id = ?`).run(gangId);
    db.prepare('UPDATE users SET gang_id = ? WHERE id = ?').run(gangId, req.user.id);

    // Check if all members accepted
    const updatedGang = db.prepare('SELECT * FROM gangs WHERE id = ?').get(gangId);
    const allAccepted =
        (!updatedGang.member2_id || updatedGang.member2_accepted) &&
        (!updatedGang.member3_id || updatedGang.member3_accepted) &&
        (!updatedGang.member4_id || updatedGang.member4_accepted);

    if (allAccepted) {
        db.prepare('UPDATE gangs SET active = 1 WHERE id = ?').run(gangId);
    }

    res.redirect('/tprobbs/gangs?message=Joined gang!');
});

// Decline invite
router.post('/decline/:gangId', requireAuth, (req, res) => {
    const db = req.app.get('tprodb');
    const gangId = parseInt(req.params.gangId, 10);

    const gang = db.prepare('SELECT * FROM gangs WHERE id = ?').get(gangId);
    if (!gang) {
        return res.redirect('/tprobbs/gangs?message=Gang not found');
    }

    // Remove from invite
    if (gang.member2_id === req.user.id) {
        db.prepare('UPDATE gangs SET member2_id = NULL, member2_accepted = 0 WHERE id = ?').run(gangId);
    } else if (gang.member3_id === req.user.id) {
        db.prepare('UPDATE gangs SET member3_id = NULL, member3_accepted = 0 WHERE id = ?').run(gangId);
    } else if (gang.member4_id === req.user.id) {
        db.prepare('UPDATE gangs SET member4_id = NULL, member4_accepted = 0 WHERE id = ?').run(gangId);
    }

    res.redirect('/tprobbs/gangs?message=Declined invite');
});

// Leave gang
router.post('/leave', requireAuth, (req, res) => {
    const db = req.app.get('tprodb');

    if (!req.user.gang_id) {
        return res.redirect('/tprobbs/gangs?message=You are not in a gang');
    }

    const gang = db.prepare('SELECT * FROM gangs WHERE id = ?').get(req.user.gang_id);

    if (gang.leader_id === req.user.id) {
        // Leader leaving disbands gang
        db.prepare('UPDATE users SET gang_id = NULL WHERE gang_id = ?').run(gang.id);
        db.prepare('DELETE FROM gangs WHERE id = ?').run(gang.id);
        return res.redirect('/tprobbs/gangs?message=Gang disbanded');
    }

    // Regular member leaving
    db.prepare('UPDATE users SET gang_id = NULL WHERE id = ?').run(req.user.id);

    // Clear from gang slots
    if (gang.member2_id === req.user.id) {
        db.prepare('UPDATE gangs SET member2_id = NULL, member2_accepted = 0 WHERE id = ?').run(gang.id);
    } else if (gang.member3_id === req.user.id) {
        db.prepare('UPDATE gangs SET member3_id = NULL, member3_accepted = 0 WHERE id = ?').run(gang.id);
    } else if (gang.member4_id === req.user.id) {
        db.prepare('UPDATE gangs SET member4_id = NULL, member4_accepted = 0 WHERE id = ?').run(gang.id);
    }

    res.redirect('/tprobbs/gangs?message=Left gang');
});

// View gang
router.get('/view/:gangId', requireAuth, (req, res) => {
    const db = req.app.get('tprodb');
    const gangId = parseInt(req.params.gangId, 10);

    const gang = db.prepare(`
        SELECT g.*, l.username as leader_name
        FROM gangs g
        LEFT JOIN users l ON g.leader_id = l.id
        WHERE g.id = ?
    `).get(gangId);

    if (!gang) {
        return res.redirect('/tprobbs/gangs?message=Gang not found');
    }

    // Get all members
    const members = db.prepare(`
        SELECT u.*, c.name as class_name
        FROM users u
        LEFT JOIN classes c ON u.class = c.id
        WHERE u.gang_id = ?
        ORDER BY u.level DESC
    `).all(gangId);

    res.render('pages/gangs/view', {
        title: gang.name,
        user: req.user,
        gang,
        members
    });
});

// Gang treasury deposit
router.post('/deposit', requireAuth, (req, res) => {
    const db = req.app.get('tprodb');
    const amount = parseInt(req.body.amount, 10) || 0;

    if (!req.user.gang_id) {
        return res.redirect('/tprobbs/gangs?message=You are not in a gang');
    }

    if (amount <= 0 || amount > req.user.gold) {
        return res.redirect('/tprobbs/gangs?message=Invalid amount');
    }

    db.prepare('UPDATE users SET gold = gold - ? WHERE id = ?').run(amount, req.user.id);
    db.prepare('UPDATE gangs SET gold = gold + ? WHERE id = ?').run(amount, req.user.gang_id);

    res.redirect('/tprobbs/gangs?message=Deposited ' + amount + ' gold to gang treasury');
});

module.exports = router;
