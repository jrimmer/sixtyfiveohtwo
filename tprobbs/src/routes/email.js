/**
 * TPro BBS Private Email Routes
 */

const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');

// Inbox
router.get('/', requireAuth, (req, res) => {
    const db = req.app.get('tprodb');
    const page = parseInt(req.query.page, 10) || 1;
    const limit = 20;
    const offset = (page - 1) * limit;

    const total = db.prepare('SELECT COUNT(*) as count FROM emails WHERE to_id = ?').get(req.user.id).count;
    const emails = db.prepare(`
        SELECT e.*, u.username as from_username
        FROM emails e
        LEFT JOIN users u ON e.from_id = u.id
        WHERE e.to_id = ?
        ORDER BY e.created_at DESC
        LIMIT ? OFFSET ?
    `).all(req.user.id, limit, offset);

    res.render('pages/email/inbox', {
        title: 'Email Inbox',
        user: req.user,
        emails,
        page,
        totalPages: Math.ceil(total / limit)
    });
});

// Sent mail
router.get('/sent', requireAuth, (req, res) => {
    const db = req.app.get('tprodb');
    const page = parseInt(req.query.page, 10) || 1;
    const limit = 20;
    const offset = (page - 1) * limit;

    const total = db.prepare('SELECT COUNT(*) as count FROM emails WHERE from_id = ?').get(req.user.id).count;
    const emails = db.prepare(`
        SELECT e.*, u.username as to_username
        FROM emails e
        LEFT JOIN users u ON e.to_id = u.id
        WHERE e.from_id = ?
        ORDER BY e.created_at DESC
        LIMIT ? OFFSET ?
    `).all(req.user.id, limit, offset);

    res.render('pages/email/sent', {
        title: 'Sent Mail',
        user: req.user,
        emails,
        page,
        totalPages: Math.ceil(total / limit)
    });
});

// Read email
router.get('/read/:emailId', requireAuth, (req, res) => {
    const db = req.app.get('tprodb');
    const emailId = parseInt(req.params.emailId, 10);

    const email = db.prepare(`
        SELECT e.*,
               uf.username as from_username,
               ut.username as to_username
        FROM emails e
        LEFT JOIN users uf ON e.from_id = uf.id
        LEFT JOIN users ut ON e.to_id = ut.id
        WHERE e.id = ? AND (e.to_id = ? OR e.from_id = ?)
    `).get(emailId, req.user.id, req.user.id);

    if (!email) {
        return res.render('pages/error', {
            status: 404,
            message: 'Email not found'
        });
    }

    // Mark as read if recipient
    if (email.to_id === req.user.id && !email.read) {
        db.prepare('UPDATE emails SET read = 1 WHERE id = ?').run(emailId);
    }

    res.render('pages/email/read', {
        title: email.subject || 'No Subject',
        user: req.user,
        email
    });
});

// Compose form
router.get('/compose', requireAuth, (req, res) => {
    const db = req.app.get('tprodb');
    const replyTo = req.query.replyTo ? parseInt(req.query.replyTo, 10) : null;
    const to = req.query.to || '';

    let replyEmail = null;
    if (replyTo) {
        replyEmail = db.prepare(`
            SELECT e.*, u.username as from_username
            FROM emails e
            LEFT JOIN users u ON e.from_id = u.id
            WHERE e.id = ? AND e.to_id = ?
        `).get(replyTo, req.user.id);
    }

    res.render('pages/email/compose', {
        title: 'Compose Email',
        user: req.user,
        error: null,
        to: replyEmail ? replyEmail.from_username : to,
        subject: replyEmail ? `Re: ${replyEmail.subject}` : '',
        body: replyEmail ? `\n\n--- Original ---\n${replyEmail.body}` : ''
    });
});

// Send email
router.post('/send', requireAuth, (req, res) => {
    const db = req.app.get('tprodb');
    const { to, subject, body } = req.body;

    const renderError = (error) => {
        return res.render('pages/email/compose', {
            title: 'Compose Email',
            user: req.user,
            error,
            to: to || '',
            subject: subject || '',
            body: body || ''
        });
    };

    if (!to || !body) {
        return renderError('Recipient and message body are required');
    }

    // Find recipient
    const recipient = db.prepare('SELECT id FROM users WHERE username = ?').get(to);
    if (!recipient) {
        return renderError('User not found');
    }

    if (recipient.id === req.user.id) {
        return renderError('Cannot send email to yourself');
    }

    db.prepare(`
        INSERT INTO emails (from_id, to_id, subject, body)
        VALUES (?, ?, ?, ?)
    `).run(req.user.id, recipient.id, (subject || 'No Subject').slice(0, 80), body.slice(0, 4000));

    res.redirect('/tprobbs/email');
});

// Delete email
router.post('/delete/:emailId', requireAuth, (req, res) => {
    const db = req.app.get('tprodb');
    const emailId = parseInt(req.params.emailId, 10);

    // Only delete if user is recipient
    db.prepare('DELETE FROM emails WHERE id = ? AND to_id = ?').run(emailId, req.user.id);

    res.redirect('/tprobbs/email');
});

module.exports = router;
