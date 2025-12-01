/**
 * Message Board Routes
 * Forums and messaging functionality
 */

const express = require('express');
const router = express.Router();

// Auth middleware
const requireAuth = (req, res, next) => {
    if (!req.session.userId) return res.redirect('/');
    next();
};

router.use(requireAuth);

// Board listing
router.get('/', (req, res) => {
    const db = req.app.get('db');
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.session.userId);

    const boards = db.prepare(`
        SELECT b.*,
               (SELECT COUNT(*) FROM messages WHERE board_id = b.id) as message_count,
               (SELECT MAX(created_at) FROM messages WHERE board_id = b.id) as last_post
        FROM boards b
        WHERE b.active = 1
        ORDER BY b.id
    `).all();

    res.render('pages/boards/list', {
        title: 'Message Boards',
        boards,
        user
    });
});

// Quickscan - show unread messages (must be before /:id route)
router.get('/quickscan', (req, res) => {
    const db = req.app.get('db');
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.session.userId);

    // Get unread messages from all boards
    const messages = db.prepare(`
        SELECT m.*, b.name as board_name
        FROM messages m
        JOIN boards b ON m.board_id = b.id
        LEFT JOIN message_reads mr ON mr.board_id = m.board_id AND mr.user_id = ?
        WHERE b.active = 1
          AND (mr.last_read_message_id IS NULL OR m.id > mr.last_read_message_id)
        ORDER BY m.created_at DESC
        LIMIT 50
    `).all(req.session.userId);

    res.render('pages/boards/quickscan', {
        title: 'Quickscan',
        messages,
        user
    });
});

// View board
router.get('/:id', (req, res) => {
    const db = req.app.get('db');
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.session.userId);
    const boardId = parseInt(req.params.id);

    // Validate boardId is positive
    if (!boardId || boardId <= 0) return res.redirect('/boards');

    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = 15;
    const offset = (page - 1) * limit;

    const board = db.prepare('SELECT * FROM boards WHERE id = ? AND active = 1').get(boardId);
    if (!board) return res.redirect('/boards');

    const messages = db.prepare(`
        SELECT * FROM messages
        WHERE board_id = ?
        ORDER BY created_at DESC
        LIMIT ? OFFSET ?
    `).all(boardId, limit, offset);

    const total = db.prepare('SELECT COUNT(*) as count FROM messages WHERE board_id = ?')
        .get(boardId).count;

    // Update last read
    db.prepare(`
        INSERT OR REPLACE INTO message_reads (user_id, board_id, last_read_message_id)
        VALUES (?, ?, (SELECT MAX(id) FROM messages WHERE board_id = ?))
    `).run(req.session.userId, boardId, boardId);

    res.render('pages/boards/view', {
        title: board.name,
        board,
        messages,
        page,
        totalPages: Math.ceil(total / limit),
        user
    });
});

// View message
router.get('/:boardId/message/:msgId', (req, res) => {
    const db = req.app.get('db');
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.session.userId);
    const boardId = parseInt(req.params.boardId);
    const msgId = parseInt(req.params.msgId);

    // Validate IDs are positive
    if (!boardId || boardId <= 0 || !msgId || msgId <= 0) return res.redirect('/boards');

    const board = db.prepare('SELECT * FROM boards WHERE id = ? AND active = 1').get(boardId);
    const message = db.prepare('SELECT * FROM messages WHERE id = ? AND board_id = ?')
        .get(msgId, boardId);

    if (!board || !message) return res.redirect('/boards');

    res.render('pages/boards/message', {
        title: message.subject,
        board,
        message,
        user
    });
});

// Post message form
router.get('/:id/post', (req, res) => {
    const db = req.app.get('db');
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.session.userId);
    const boardId = parseInt(req.params.id);

    // Validate boardId is positive
    if (!boardId || boardId <= 0) return res.redirect('/boards');

    const board = db.prepare('SELECT * FROM boards WHERE id = ? AND active = 1').get(boardId);
    if (!board) return res.redirect('/boards');

    res.render('pages/boards/post', {
        title: 'Post Message',
        board,
        user
    });
});

// Post message handler
router.post('/:id/post', (req, res) => {
    const db = req.app.get('db');
    const boardId = parseInt(req.params.id);

    // Validate boardId is positive
    if (!boardId || boardId <= 0) return res.redirect('/boards');

    const { subject, body, anonymous } = req.body;

    // Validate subject and body are provided and not empty
    if (!subject || !subject.trim() || !body || !body.trim()) {
        return res.redirect(`/boards/${boardId}/post?error=empty`);
    }

    const board = db.prepare('SELECT * FROM boards WHERE id = ? AND active = 1').get(boardId);
    if (!board) return res.redirect('/boards');

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.session.userId);

    // Determine author name based on board settings
    let authorName = user.name;
    if (board.post_mode === 1 && anonymous) {
        authorName = 'Anonymous';
    }

    db.prepare(`
        INSERT INTO messages (board_id, subject, body, author_id, author_name)
        VALUES (?, ?, ?, ?, ?)
    `).run(boardId, subject, body, req.session.userId, authorName);

    res.redirect(`/boards/${boardId}`);
});

module.exports = router;
