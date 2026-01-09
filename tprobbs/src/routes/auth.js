/**
 * TPro BBS Authentication Routes
 */

const express = require('express');
const bcrypt = require('bcrypt');
const router = express.Router();

// Login page
router.get('/', (req, res) => {
    if (req.session.tproUserId) {
        return res.redirect('/tprobbs/main');
    }
    res.render('pages/login', {
        title: 'Lost Gonzo BBS',
        error: null,
        success: null
    });
});

// Login handler
router.post('/login', async (req, res) => {
    const { username, password } = req.body;
    const db = req.app.get('tprodb');

    try {
        const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);

        if (!user) {
            return res.render('pages/login', {
                title: 'Lost Gonzo BBS',
                error: 'User not found. Register as a new user?',
                success: null
            });
        }

        const validPassword = await bcrypt.compare(password, user.password_hash);
        if (!validPassword) {
            return res.render('pages/login', {
                title: 'Lost Gonzo BBS',
                error: 'Invalid password!',
                success: null
            });
        }

        // Check daily call limit
        const today = new Date().toISOString().split('T')[0];
        const accessLevel = db.prepare('SELECT * FROM access_levels WHERE id = ?')
            .get(user.access_level);

        if (user.last_call_date !== today) {
            // New day, reset
            db.prepare('UPDATE users SET calls_today = 0, arena_fights_today = 0 WHERE id = ?')
                .run(user.id);
        } else if (user.calls_today >= accessLevel.calls_per_day) {
            return res.render('pages/login', {
                title: 'Lost Gonzo BBS',
                error: `You have used all ${accessLevel.calls_per_day} calls for today.`,
                success: null
            });
        }

        // Update login info
        db.prepare(`
            UPDATE users
            SET last_on = CURRENT_TIMESTAMP,
                calls_today = calls_today + 1,
                calls = calls + 1,
                last_call_date = ?
            WHERE id = ?
        `).run(today, user.id);

        // Set session
        req.session.tproUserId = user.id;
        req.session.tproUsername = user.username;
        req.session.tproLoginTime = Date.now();

        res.redirect('/tprobbs/main');
    } catch (err) {
        console.error('Login error:', err);
        res.render('pages/login', {
            title: 'Lost Gonzo BBS',
            error: 'An error occurred. Please try again.',
            success: null
        });
    }
});

// Registration page
router.get('/register', (req, res) => {
    const db = req.app.get('tprodb');
    const classes = db.prepare('SELECT * FROM classes WHERE id > 0').all();

    res.render('pages/register', {
        title: 'New User Registration',
        error: null,
        classes
    });
});

// Registration handler
router.post('/register', async (req, res) => {
    const { username, password, classId, stamina, intellect, agility, charisma } = req.body;
    const db = req.app.get('tprodb');

    const renderError = (error) => {
        const classes = db.prepare('SELECT * FROM classes WHERE id > 0').all();
        return res.render('pages/register', {
            title: 'New User Registration',
            error,
            classes
        });
    };

    try {
        // Validate username
        if (!username || username.length < 3 || username.length > 25) {
            return renderError('Username must be 3-25 characters.');
        }
        if (!/^[a-zA-Z0-9_]+$/.test(username)) {
            return renderError('Username can only contain letters, numbers, and underscores.');
        }

        // Validate password
        if (!password || password.length < 6) {
            return renderError('Password must be at least 6 characters.');
        }

        // Check if username exists
        const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
        if (existing) {
            return renderError('Username already exists!');
        }

        // Validate stats (200 points, each 20-80)
        const stats = {
            stamina: parseInt(stamina, 10) || 50,
            intellect: parseInt(intellect, 10) || 50,
            agility: parseInt(agility, 10) || 50,
            charisma: parseInt(charisma, 10) || 50
        };

        const total = stats.stamina + stats.intellect + stats.agility + stats.charisma;
        if (total !== 200) {
            return renderError(`Stats must total exactly 200. You have ${total}.`);
        }

        for (const [stat, value] of Object.entries(stats)) {
            if (value < 20 || value > 80) {
                return renderError(`${stat} must be between 20 and 80.`);
            }
        }

        // Validate class
        const playerClass = parseInt(classId, 10) || 1;
        const classData = db.prepare('SELECT * FROM classes WHERE id = ?').get(playerClass);
        if (!classData) {
            return renderError('Invalid class selection.');
        }

        // Hash password
        const passwordHash = await bcrypt.hash(password, 10);

        // Calculate starting SP (15 if spell-casting class)
        const startingSP = classData.sp_on_create ? 15 : 0;

        // Create user
        db.prepare(`
            INSERT INTO users (
                username, password_hash, class,
                stamina, intellect, agility, charisma,
                hit_points, max_hp, spell_power, max_sp,
                weapon, armor, gold
            ) VALUES (?, ?, ?, ?, ?, ?, ?, 15, 15, ?, ?, 1, 1, 0)
        `).run(
            username, passwordHash, playerClass,
            stats.stamina, stats.intellect, stats.agility, stats.charisma,
            startingSP, startingSP
        );

        res.render('pages/login', {
            title: 'Lost Gonzo BBS',
            error: null,
            success: 'Registration successful! You may now login.'
        });
    } catch (err) {
        console.error('Registration error:', err);
        return renderError('Registration failed. Please try again.');
    }
});

// Logout
router.get('/logout', (req, res) => {
    req.session.tproUserId = null;
    req.session.tproUsername = null;
    req.session.tproLoginTime = null;
    res.redirect('/tprobbs/');
});

module.exports = router;
