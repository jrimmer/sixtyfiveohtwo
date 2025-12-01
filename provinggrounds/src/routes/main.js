/**
 * Main Menu Routes
 * Core BBS navigation and features
 */

const express = require('express');
const router = express.Router();

// Auth middleware
const requireAuth = (req, res, next) => {
    if (!req.session.userId) {
        return res.redirect('/');
    }
    next();
};

// Load user data middleware
const loadUser = (req, res, next) => {
    const db = req.app.get('db');
    const user = db.prepare(`
        SELECT u.*,
               w.name as weapon_name, w.power as weapon_power,
               a.name as armor_name, a.power as armor_power,
               l.title as rank_title
        FROM users u
        LEFT JOIN weapons w ON u.weapon_id = w.id
        LEFT JOIN armor a ON u.armor_id = a.id
        LEFT JOIN levels l ON u.level = l.level
        WHERE u.id = ?
    `).get(req.session.userId);

    if (!user) {
        req.session.destroy();
        return res.redirect('/');
    }

    // Calculate time remaining
    const minutesPerCall = parseInt(db.prepare("SELECT value FROM config WHERE key = 'minutes_per_call'").get()?.value || '60');
    const loginTime = req.session.loginTime || Date.now();
    const elapsedMinutes = Math.floor((Date.now() - loginTime) / 60000);
    user.timeRemaining = Math.max(0, minutesPerCall - elapsedMinutes);

    // Check if time expired
    if (user.timeRemaining <= 0) {
        return res.redirect('/logout');
    }

    req.user = user;
    res.locals.user = user;
    next();
};

router.use(requireAuth, loadUser);

// Main menu
router.get('/', (req, res) => {
    const db = req.app.get('db');

    // Get user's spells
    const spells = db.prepare(`
        SELECT s.name, us.quantity
        FROM user_spells us
        JOIN spells s ON us.spell_id = s.id
        WHERE us.user_id = ? AND us.quantity > 0
    `).all(req.session.userId);

    // Get unread mail count
    const unreadMail = db.prepare(`
        SELECT COUNT(*) as count FROM mail WHERE to_user_id = ? AND is_read = 0
    `).get(req.session.userId);

    // Get config
    const config = {};
    const configRows = db.prepare('SELECT key, value FROM config').all();
    for (const row of configRows) {
        config[row.key] = row.value;
    }

    res.render('pages/main', {
        title: 'Main Menu',
        user: req.user,
        spells,
        unreadMail: unreadMail.count,
        config
    });
});

// Character stats
router.get('/stats', (req, res) => {
    const db = req.app.get('db');

    const spells = db.prepare(`
        SELECT s.*, us.quantity
        FROM user_spells us
        JOIN spells s ON us.spell_id = s.id
        WHERE us.user_id = ? AND us.quantity > 0
    `).all(req.session.userId);

    // Get next level info
    const nextLevel = db.prepare(`
        SELECT * FROM levels WHERE level = ?
    `).get(req.user.level + 1);

    const expNeeded = nextLevel ? nextLevel.experience_required - req.user.experience : 0;

    res.render('pages/stats', {
        title: 'Character Stats',
        user: req.user,
        spells,
        expNeeded
    });
});

// Member listing
router.get('/members', (req, res) => {
    const db = req.app.get('db');
    const page = parseInt(req.query.page) || 1;
    const limit = 15;
    const offset = (page - 1) * limit;

    const members = db.prepare(`
        SELECT u.id, u.name, u.level, u.status, u.last_login,
               l.title as rank_title
        FROM users u
        LEFT JOIN levels l ON u.level = l.level
        ORDER BY u.id
        LIMIT ? OFFSET ?
    `).all(limit, offset);

    const total = db.prepare('SELECT COUNT(*) as count FROM users').get().count;

    res.render('pages/members', {
        title: 'Member Listing',
        members,
        page,
        totalPages: Math.ceil(total / limit)
    });
});

// The Ladder (rankings)
router.get('/ladder', (req, res) => {
    const db = req.app.get('db');
    const page = parseInt(req.query.page) || 1;
    const limit = 15;
    const offset = (page - 1) * limit;

    const rankings = db.prepare(`
        SELECT r.rank_position, u.name, u.level, r.status
        FROM rankings r
        JOIN users u ON r.user_id = u.id
        ORDER BY r.rank_position
        LIMIT ? OFFSET ?
    `).all(limit, offset);

    const total = db.prepare('SELECT COUNT(*) as count FROM rankings').get().count;

    res.render('pages/ladder', {
        title: 'The Ladder',
        rankings,
        page,
        totalPages: Math.ceil(total / limit)
    });
});

// News
router.get('/news', (req, res) => {
    const db = req.app.get('db');

    const news = db.prepare(`
        SELECT * FROM news ORDER BY created_at DESC LIMIT 10
    `).all();

    res.render('pages/news', {
        title: 'News & Updates',
        news
    });
});

// Treasury
router.get('/treasury', (req, res) => {
    res.render('pages/treasury', {
        title: 'Castle Treasury',
        user: req.user
    });
});

router.post('/treasury/deposit', (req, res) => {
    const db = req.app.get('db');
    const amount = parseInt(req.body.amount) || 0;

    if (amount <= 0 || amount > req.user.gold) {
        return res.redirect('/main/treasury?error=invalid');
    }

    db.prepare('UPDATE users SET gold = gold - ?, treasury = treasury + ? WHERE id = ?')
        .run(amount, amount, req.session.userId);

    res.redirect('/main/treasury?success=deposit');
});

router.post('/treasury/withdraw', (req, res) => {
    const db = req.app.get('db');
    const amount = parseInt(req.body.amount) || 0;

    if (amount <= 0 || amount > req.user.treasury) {
        return res.redirect('/main/treasury?error=invalid');
    }

    db.prepare('UPDATE users SET gold = gold + ?, treasury = treasury - ? WHERE id = ?')
        .run(amount, amount, req.session.userId);

    res.redirect('/main/treasury?success=withdraw');
});

// Voting booth
router.get('/vote', (req, res) => {
    const db = req.app.get('db');

    // Get all active voting topics
    const topicRows = db.prepare('SELECT * FROM voting_topics WHERE active = 1 ORDER BY id DESC').all();

    const topics = topicRows.map(topic => {
        const options = db.prepare('SELECT * FROM voting_options WHERE topic_id = ?').all(topic.id);
        const vote = db.prepare('SELECT * FROM user_votes WHERE user_id = ? AND topic_id = ?')
            .get(req.session.userId, topic.id);

        // Calculate vote totals for display
        const totalVotes = options.reduce((sum, opt) => sum + opt.votes, 0);
        for (const opt of options) {
            opt.percentage = totalVotes > 0 ? Math.round((opt.votes / totalVotes) * 100) : 0;
        }

        return {
            ...topic,
            options,
            hasVoted: !!vote || req.user.voted_today
        };
    });

    res.render('pages/vote', {
        title: 'Voting Booth',
        topics
    });
});

router.post('/vote/:topicId', (req, res) => {
    const db = req.app.get('db');
    const topicId = parseInt(req.params.topicId);
    const optionId = parseInt(req.body.option);

    // Check if already voted on this topic
    const existingVote = db.prepare('SELECT * FROM user_votes WHERE user_id = ? AND topic_id = ?')
        .get(req.session.userId, topicId);

    if (existingVote || req.user.voted_today) {
        return res.redirect('/main/vote?error=already_voted');
    }

    const option = db.prepare('SELECT * FROM voting_options WHERE id = ? AND topic_id = ?').get(optionId, topicId);
    if (!option) {
        return res.redirect('/main/vote?error=invalid');
    }

    // Record vote
    db.prepare('INSERT INTO user_votes (user_id, topic_id, option_id) VALUES (?, ?, ?)')
        .run(req.session.userId, topicId, optionId);

    db.prepare('UPDATE voting_options SET votes = votes + 1 WHERE id = ?').run(optionId);

    // Award gold, experience, and a chance for extra call
    const reward = req.user.level * 100;
    const earnedExtraCall = Math.random() < 0.1; // 10% chance to earn extra call

    if (earnedExtraCall) {
        db.prepare('UPDATE users SET gold = gold + ?, experience = experience + ?, voted_today = 1, extra_calls = extra_calls + 1 WHERE id = ?')
            .run(reward, reward, req.session.userId);
        res.redirect('/main/vote?success=' + reward + '&bonus=call');
    } else {
        db.prepare('UPDATE users SET gold = gold + ?, experience = experience + ?, voted_today = 1 WHERE id = ?')
            .run(reward, reward, req.session.userId);
        res.redirect('/main/vote?success=' + reward);
    }
});

// Change password
router.get('/password', (req, res) => {
    res.render('pages/password', {
        title: 'Change Password'
    });
});

router.post('/password', async (req, res) => {
    const bcrypt = require('bcrypt');
    const db = req.app.get('db');
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 4 || newPassword.length > 20) {
        return res.render('pages/password', {
            title: 'Change Password',
            error: 'Password must be 4-20 characters'
        });
    }

    const hash = await bcrypt.hash(newPassword, 10);
    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, req.session.userId);

    res.render('pages/password', {
        title: 'Change Password',
        success: 'Password changed successfully!'
    });
});

// Help file
router.get('/help', (req, res) => {
    res.render('pages/help', {
        title: 'Help File'
    });
});

// User message
router.post('/message', (req, res) => {
    const db = req.app.get('db');
    const message = (req.body.message || '').substring(0, 40);

    db.prepare('UPDATE users SET user_message = ? WHERE id = ?')
        .run(message, req.session.userId);

    res.redirect('/main');
});

// Admin: Grant extra calls to a user (admin only)
router.post('/admin/grant-calls', (req, res) => {
    if (!req.session.isAdmin && !req.user.is_admin) {
        return res.redirect('/main?error=unauthorized');
    }

    const db = req.app.get('db');
    const { userId, amount } = req.body;
    const callsToGrant = parseInt(amount) || 1;
    const targetUserId = parseInt(userId);

    // Validate inputs are positive
    if (callsToGrant <= 0 || !targetUserId || targetUserId <= 0) {
        return res.redirect('/main/members?error=invalid');
    }

    // Verify target user exists
    const targetUser = db.prepare('SELECT id FROM users WHERE id = ?').get(targetUserId);
    if (!targetUser) {
        return res.redirect('/main/members?error=invalid');
    }

    db.prepare('UPDATE users SET extra_calls = extra_calls + ? WHERE id = ?')
        .run(callsToGrant, targetUserId);

    res.redirect('/main/members?success=granted');
});

// Admin: Toggle admin status (admin only)
router.post('/admin/toggle-admin', (req, res) => {
    if (!req.session.isAdmin && !req.user.is_admin) {
        return res.redirect('/main?error=unauthorized');
    }

    const db = req.app.get('db');
    const { userId } = req.body;
    const targetUserId = parseInt(userId);

    // Validate userId is positive
    if (!targetUserId || targetUserId <= 0) {
        return res.redirect('/main/members?error=invalid');
    }

    // Can't remove your own admin status
    if (targetUserId === req.session.userId) {
        return res.redirect('/main/members?error=self');
    }

    // Verify target user exists
    const targetUser = db.prepare('SELECT id FROM users WHERE id = ?').get(targetUserId);
    if (!targetUser) {
        return res.redirect('/main/members?error=invalid');
    }

    db.prepare('UPDATE users SET is_admin = CASE WHEN is_admin = 1 THEN 0 ELSE 1 END WHERE id = ?')
        .run(targetUserId);

    res.redirect('/main/members?success=toggled');
});

module.exports = router;
