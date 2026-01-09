/**
 * TPro BBS Message Boards Routes
 */

const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');

// List all boards
router.get('/', requireAuth, (req, res) => {
    const db = req.app.get('tprodb');

    const boards = db.prepare(`
        SELECT b.*,
               (SELECT COUNT(*) FROM posts WHERE board_id = b.id) as post_count,
               (SELECT MAX(created_at) FROM posts WHERE board_id = b.id) as last_post
        FROM boards b
        WHERE b.access_level <= ?
        ORDER BY b.id
    `).all(req.user.access_level);

    res.render('pages/boards/list', {
        title: 'Message Boards',
        user: req.user,
        boards
    });
});

// View a board's posts
router.get('/:boardId', requireAuth, (req, res) => {
    const db = req.app.get('tprodb');
    const boardId = parseInt(req.params.boardId, 10);
    const page = parseInt(req.query.page, 10) || 1;
    const limit = 20;
    const offset = (page - 1) * limit;

    const board = db.prepare('SELECT * FROM boards WHERE id = ?').get(boardId);
    if (!board) {
        return res.render('pages/error', {
            status: 404,
            message: 'Board not found'
        });
    }

    if (board.access_level > req.user.access_level) {
        return res.render('pages/error', {
            status: 403,
            message: 'You do not have access to this board'
        });
    }

    const total = db.prepare('SELECT COUNT(*) as count FROM posts WHERE board_id = ?').get(boardId).count;
    const posts = db.prepare(`
        SELECT p.*, u.username
        FROM posts p
        LEFT JOIN users u ON p.user_id = u.id
        WHERE p.board_id = ?
        ORDER BY p.created_at DESC
        LIMIT ? OFFSET ?
    `).all(boardId, limit, offset);

    res.render('pages/boards/view', {
        title: board.name,
        user: req.user,
        board,
        posts,
        page,
        totalPages: Math.ceil(total / limit)
    });
});

// New post form
router.get('/:boardId/new', requireAuth, (req, res) => {
    const db = req.app.get('tprodb');
    const boardId = parseInt(req.params.boardId, 10);

    const board = db.prepare('SELECT * FROM boards WHERE id = ?').get(boardId);
    if (!board || board.access_level > req.user.access_level) {
        return res.render('pages/error', {
            status: 403,
            message: 'Cannot post to this board'
        });
    }

    res.render('pages/boards/post', {
        title: `New Post - ${board.name}`,
        user: req.user,
        board,
        error: null
    });
});

// Create new post
router.post('/:boardId/new', requireAuth, (req, res) => {
    const db = req.app.get('tprodb');
    const boardId = parseInt(req.params.boardId, 10);
    const { subject, body } = req.body;

    const board = db.prepare('SELECT * FROM boards WHERE id = ?').get(boardId);
    if (!board || board.access_level > req.user.access_level) {
        return res.render('pages/error', {
            status: 403,
            message: 'Cannot post to this board'
        });
    }

    if (!subject || !body) {
        return res.render('pages/boards/post', {
            title: `New Post - ${board.name}`,
            user: req.user,
            board,
            error: 'Subject and body are required'
        });
    }

    db.prepare(`
        INSERT INTO posts (board_id, user_id, subject, body)
        VALUES (?, ?, ?, ?)
    `).run(boardId, req.user.id, subject.slice(0, 80), body.slice(0, 4000));

    res.redirect(`/tprobbs/boards/${boardId}`);
});

// View single post
router.get('/:boardId/post/:postId', requireAuth, (req, res) => {
    const db = req.app.get('tprodb');
    const boardId = parseInt(req.params.boardId, 10);
    const postId = parseInt(req.params.postId, 10);

    const board = db.prepare('SELECT * FROM boards WHERE id = ?').get(boardId);
    if (!board || board.access_level > req.user.access_level) {
        return res.render('pages/error', {
            status: 403,
            message: 'Cannot view this board'
        });
    }

    const post = db.prepare(`
        SELECT p.*, u.username
        FROM posts p
        LEFT JOIN users u ON p.user_id = u.id
        WHERE p.id = ? AND p.board_id = ?
    `).get(postId, boardId);

    if (!post) {
        return res.render('pages/error', {
            status: 404,
            message: 'Post not found'
        });
    }

    res.render('pages/boards/read', {
        title: post.subject,
        user: req.user,
        board,
        post
    });
});

module.exports = router;
