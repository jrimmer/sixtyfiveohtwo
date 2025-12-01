/**
 * Authentication Routes
 * Handles login, registration, and session management
 */

const express = require('express');
const bcrypt = require('bcrypt');
const router = express.Router();

/**
 * Generate a terminal-style math CAPTCHA
 * Returns { question, answer, display }
 */
function generateCaptcha() {
    const ops = ['+', '-', '*'];
    const op = ops[Math.floor(Math.random() * ops.length)];
    let a, b, answer;

    switch (op) {
        case '+':
            a = Math.floor(Math.random() * 20) + 1;
            b = Math.floor(Math.random() * 20) + 1;
            answer = a + b;
            break;
        case '-':
            a = Math.floor(Math.random() * 20) + 10;
            b = Math.floor(Math.random() * a);
            answer = a - b;
            break;
        case '*':
            a = Math.floor(Math.random() * 10) + 1;
            b = Math.floor(Math.random() * 10) + 1;
            answer = a * b;
            break;
    }

    const question = `${a} ${op} ${b}`;
    const display = `
+-------------------------------+
|       SECURITY CHALLENGE      |
|-------------------------------|
|                               |
|   Solve:  ${question.padEnd(10)}          |
|                               |
+-------------------------------+`.trim();

    return { question, answer: answer.toString(), display };
}

// Home/Login page
router.get('/', (req, res) => {
    if (req.session.userId) {
        return res.redirect('/main');
    }
    res.render('pages/login', {
        title: 'The Proving Grounds',
        error: null
    });
});

// Login handler
router.post('/login', async (req, res) => {
    const { username, password, bypass } = req.body;
    const db = req.app.get('db');
    const bypassKey = bypass || req.query.bypass;

    try {
        const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);

        if (!user) {
            return res.render('pages/login', {
                title: 'The Proving Grounds',
                error: 'User not found. Register as a new user?'
            });
        }

        const validPassword = await bcrypt.compare(password, user.password_hash);
        if (!validPassword) {
            return res.render('pages/login', {
                title: 'The Proving Grounds',
                error: 'Invalid password!'
            });
        }

        // Check daily call limit
        const today = new Date().toISOString().split('T')[0];
        let callsToday = user.calls_today;

        // Reset daily counters if new day
        if (user.last_call_date !== today) {
            db.prepare(`
                UPDATE users
                SET calls_today = 0, fights_today = 0, jousts_today = 0, voted_today = 0
                WHERE id = ?
            `).run(user.id);
            callsToday = 0;
        }

        // Check if user has exceeded their daily call limit
        const totalAllowedCalls = user.calls_per_day + (user.extra_calls || 0);
        const hasExceededLimit = callsToday >= totalAllowedCalls;

        // Determine if bypass is allowed
        const isAdmin = user.is_admin === 1;
        const hasValidBypassKey = bypassKey === process.env.LOGIN_BYPASS_KEY;
        const canUseExtraCall = user.extra_calls > 0 && callsToday >= user.calls_per_day;

        if (hasExceededLimit && !isAdmin && !hasValidBypassKey) {
            return res.render('pages/login', {
                title: 'The Proving Grounds',
                error: `You have used all ${user.calls_per_day} calls for today. Come back tomorrow!`
            });
        }

        // Consume an extra call if using one
        let usedExtraCall = false;
        if (callsToday >= user.calls_per_day && !isAdmin && !hasValidBypassKey && canUseExtraCall) {
            db.prepare('UPDATE users SET extra_calls = extra_calls - 1 WHERE id = ?').run(user.id);
            usedExtraCall = true;
        }

        // Update login info
        db.prepare(`
            UPDATE users
            SET last_login = CURRENT_TIMESTAMP,
                calls_today = calls_today + 1,
                total_calls = total_calls + 1,
                last_call_date = ?
            WHERE id = ?
        `).run(today, user.id);

        // Set session
        req.session.userId = user.id;
        req.session.username = user.name;
        req.session.isAdmin = isAdmin;
        req.session.isSysop = user.validation_level === 'sysop';
        req.session.loginTime = Date.now();
        req.session.usedExtraCall = usedExtraCall;

        // Log the call
        db.prepare(`
            INSERT INTO call_log (user_id, validation_status, extra_calls)
            VALUES (?, ?, ?)
        `).run(user.id, user.validation_level, usedExtraCall ? 1 : 0);

        res.redirect('/main');
    } catch (err) {
        console.error('Login error:', err);
        res.render('pages/login', {
            title: 'The Proving Grounds',
            error: 'An error occurred. Please try again.'
        });
    }
});

// Registration page
router.get('/register', (req, res) => {
    const db = req.app.get('db');
    const captchaEnabled = db.prepare("SELECT value FROM config WHERE key = 'registration_captcha'").get()?.value === '1';

    let captcha = null;
    if (captchaEnabled) {
        captcha = generateCaptcha();
        req.session.captchaAnswer = captcha.answer;
    }

    res.render('pages/register', {
        title: 'New User Registration',
        error: null,
        captcha: captchaEnabled ? captcha : null
    });
});

// Registration handler
router.post('/register', async (req, res) => {
    const { username, password, characterName, captchaAnswer } = req.body;
    const db = req.app.get('db');
    const captchaEnabled = db.prepare("SELECT value FROM config WHERE key = 'registration_captcha'").get()?.value === '1';

    // Helper to render error with new CAPTCHA
    const renderError = (error) => {
        let captcha = null;
        if (captchaEnabled) {
            captcha = generateCaptcha();
            req.session.captchaAnswer = captcha.answer;
        }
        return res.render('pages/register', {
            title: 'New User Registration',
            error,
            captcha
        });
    };

    try {
        // Validate CAPTCHA if enabled
        if (captchaEnabled) {
            if (!captchaAnswer || captchaAnswer.trim() !== req.session.captchaAnswer) {
                return renderError('Incorrect answer. Please try again.');
            }
        }

        // Check if username exists
        const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
        if (existing) {
            return renderError('Username already exists!');
        }

        // Hash password
        const passwordHash = await bcrypt.hash(password, 10);

        // Get starting equipment (first/cheapest items)
        const startWeapon = db.prepare('SELECT id FROM weapons ORDER BY price ASC, id ASC LIMIT 1').get();
        const startArmor = db.prepare('SELECT id FROM armor ORDER BY price ASC, id ASC LIMIT 1').get();

        // Create user
        const result = db.prepare(`
            INSERT INTO users (
                username, password_hash, name,
                strength, agility, wisdom, intelligence,
                hp, max_hp, power, max_power,
                weapon_id, armor_id, gold, food
            ) VALUES (?, ?, ?, 10, 10, 10, 10, 20, 20, 20, 20, ?, ?, 500, 100)
        `).run(username, passwordHash, characterName || username, startWeapon.id, startArmor.id);

        // Initialize user spells (all at 0)
        const spells = db.prepare('SELECT id FROM spells').all();
        const insertSpell = db.prepare('INSERT INTO user_spells (user_id, spell_id, quantity) VALUES (?, ?, 0)');
        for (const spell of spells) {
            insertSpell.run(result.lastInsertRowid, spell.id);
        }

        // Initialize castle rooms (all empty)
        const insertRoom = db.prepare('INSERT INTO castle_rooms (user_id, room_number) VALUES (?, ?)');
        for (let i = 1; i <= 19; i++) {
            insertRoom.run(result.lastInsertRowid, i);
        }

        // Create joust record
        db.prepare('INSERT INTO joust_records (user_id) VALUES (?)').run(result.lastInsertRowid);

        // Add to rankings
        const rankCount = db.prepare('SELECT COUNT(*) as count FROM rankings').get();
        db.prepare('INSERT INTO rankings (user_id, rank_position, level) VALUES (?, ?, 1)')
            .run(result.lastInsertRowid, rankCount.count + 1);

        res.render('pages/login', {
            title: 'The Proving Grounds',
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
    const db = req.app.get('db');

    if (req.session.userId) {
        // Update call log with logout time
        db.prepare(`
            UPDATE call_log
            SET logout_time = CURRENT_TIMESTAMP
            WHERE user_id = ? AND logout_time IS NULL
        `).run(req.session.userId);
    }

    req.session.destroy();
    res.redirect('/');
});

module.exports = router;
