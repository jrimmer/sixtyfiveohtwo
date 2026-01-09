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

// Information section
router.get('/info', requireAuth, (req, res) => {
    const db = req.app.get('tprodb');

    // Get system stats
    const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
    const postCount = db.prepare('SELECT COUNT(*) as count FROM posts').get().count;
    const emailCount = db.prepare('SELECT COUNT(*) as count FROM emails').get().count;

    res.render('pages/info', {
        title: 'Information',
        user: req.user,
        stats: {
            users: userCount,
            posts: postCount,
            emails: emailCount
        }
    });
});

// Voting booth
router.get('/vote', requireAuth, (req, res) => {
    const db = req.app.get('tprodb');

    // Get today's date for daily voting limit
    const today = new Date().toISOString().split('T')[0];

    // Check if user already voted today
    const hasVoted = db.prepare(
        'SELECT voted_date FROM users WHERE id = ?'
    ).get(req.user.id);

    const canVote = !hasVoted.voted_date || hasVoted.voted_date !== today;

    // Get candidates (top level players)
    const candidates = db.prepare(`
        SELECT u.id, u.username, u.level, c.name as class_name, u.votes
        FROM users u
        LEFT JOIN classes c ON u.class = c.id
        WHERE u.id != ?
        ORDER BY u.votes DESC, u.level DESC
        LIMIT 10
    `).all(req.user.id);

    // Get current king/queen
    const ruler = db.prepare(`
        SELECT u.username, u.level, c.name as class_name, u.votes
        FROM users u
        LEFT JOIN classes c ON u.class = c.id
        ORDER BY u.votes DESC
        LIMIT 1
    `).get();

    res.render('pages/vote', {
        title: 'Voting Booth',
        user: req.user,
        canVote,
        candidates,
        ruler,
        message: req.query.message,
        messageType: req.query.type
    });
});

// Cast vote
router.post('/vote/:id', requireAuth, (req, res) => {
    const db = req.app.get('tprodb');
    const candidateId = parseInt(req.params.id, 10);
    const today = new Date().toISOString().split('T')[0];

    // Check if already voted today
    const user = db.prepare('SELECT voted_date FROM users WHERE id = ?').get(req.user.id);
    if (user.voted_date === today) {
        return res.redirect('/tprobbs/main/vote?message=You+already+voted+today&type=error');
    }

    // Can't vote for yourself
    if (candidateId === req.user.id) {
        return res.redirect('/tprobbs/main/vote?message=Cannot+vote+for+yourself&type=error');
    }

    // Verify candidate exists
    const candidate = db.prepare('SELECT id, username FROM users WHERE id = ?').get(candidateId);
    if (!candidate) {
        return res.redirect('/tprobbs/main/vote?message=Invalid+candidate&type=error');
    }

    // Cast vote
    db.prepare('UPDATE users SET votes = votes + 1 WHERE id = ?').run(candidateId);
    db.prepare('UPDATE users SET voted_date = ? WHERE id = ?').run(today, req.user.id);

    res.redirect(`/tprobbs/main/vote?message=Vote+cast+for+${encodeURIComponent(candidate.username)}&type=success`);
});

module.exports = router;
