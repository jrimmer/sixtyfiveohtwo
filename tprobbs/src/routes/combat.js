/**
 * TPro BBS Combat Routes (Dungeon & Arena)
 */

const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');

// Combat damage formula from BASIC source
function calculateDamage(attacker, defender, isPlayer) {
    const weapon = isPlayer ? attacker.weapon : Math.floor(attacker.id / 10) + 1;
    const level = isPlayer ? attacker.level : Math.floor(attacker.id / 10) + 1;
    const stamina = isPlayer ? attacker.stamina : 50;
    const armor = isPlayer ? defender.armor || 1 : (defender.armor || 1);

    let damage = (4 * weapon + level + stamina / 10 - armor) / 2;
    damage = damage + Math.random() * (Math.abs(damage) + 1);
    return Math.max(0, Math.floor(damage));
}

// XP reward formula
function calculateXP(dungeonLevel) {
    return Math.floor(Math.pow(2, dungeonLevel + 2) * 1000 / 15);
}

// Gold reward formula
function calculateGold(dungeonLevel, charisma) {
    const base = Math.pow(2, dungeonLevel) * 100;
    return Math.floor(base * (50 + charisma / 4) / 100 * (0.5 + Math.random()));
}

// Check if player can level up
function checkLevelUp(db, user) {
    const xpRequired = Math.pow(2, user.level + 1) * (1100 + user.intellect * 2);
    if (user.experience >= xpRequired && user.level < 100) {
        // Level up
        const hpGain = Math.floor(5 + user.stamina / 20 + Math.random() * 5);
        const spGain = user.max_sp > 0 ? Math.floor(3 + user.intellect / 20 + Math.random() * 3) : 0;

        db.prepare(`
            UPDATE users
            SET level = level + 1,
                max_hp = max_hp + ?,
                hit_points = hit_points + ?,
                max_sp = max_sp + ?,
                spell_power = spell_power + ?
            WHERE id = ?
        `).run(hpGain, hpGain, spGain, spGain, user.id);

        return { leveledUp: true, hpGain, spGain, newLevel: user.level + 1 };
    }
    return { leveledUp: false };
}

// Dungeon menu
router.get('/', requireAuth, (req, res) => {
    if (!req.user.status) {
        return res.render('pages/combat/dead', {
            title: 'You Are Dead',
            user: req.user
        });
    }

    res.render('pages/combat/menu', {
        title: 'Combat Menu',
        user: req.user
    });
});

// Enter dungeon
router.get('/dungeon', requireAuth, (req, res) => {
    if (!req.user.status) {
        return res.redirect('/tprobbs/combat');
    }

    const db = req.app.get('tprodb');

    // Initialize dungeon session if needed
    if (!req.session.dungeon) {
        req.session.dungeon = {
            level: 1,
            room: 0,
            inCombat: false,
            monster: null
        };
    }

    res.render('pages/combat/dungeon', {
        title: 'The Dungeon',
        user: req.user,
        dungeon: req.session.dungeon
    });
});

// Move in dungeon
router.post('/dungeon/move', requireAuth, (req, res) => {
    if (!req.user.status) {
        return res.redirect('/tprobbs/combat');
    }

    const db = req.app.get('tprodb');
    const { direction } = req.body;

    if (!req.session.dungeon) {
        return res.redirect('/tprobbs/combat/dungeon');
    }

    // Move to new room
    const d = req.session.dungeon;
    if (direction === 'deeper' && d.level < 7) {
        d.level++;
        d.room = 0;
    } else if (direction === 'up' && d.level > 1) {
        d.level--;
        d.room = 0;
    } else if (direction === 'forward') {
        d.room = (d.room + 1) % 49;
    }

    // Check for encounter (higher chance deeper in dungeon)
    const encounterChance = 0.3 + (d.level * 0.05);
    if (Math.random() < encounterChance) {
        // Select monster based on dungeon level
        const minId = (d.level - 1) * 14 + 1;
        const maxId = Math.min(d.level * 14, 100);
        const monsterId = Math.floor(Math.random() * (maxId - minId + 1)) + minId;

        const monster = db.prepare('SELECT * FROM monsters WHERE id = ?').get(monsterId);
        if (monster) {
            const monsterLevel = Math.floor(monsterId / 10) + 1;
            d.inCombat = true;
            d.monster = {
                ...monster,
                level: monsterLevel,
                hp: 10 + monsterLevel * 5 + Math.floor(Math.random() * monsterLevel * 3),
                maxHp: 10 + monsterLevel * 5
            };
            d.monster.maxHp = d.monster.hp;
        }
    }

    req.session.dungeon = d;
    res.redirect('/tprobbs/combat/dungeon');
});

// Combat action
router.post('/dungeon/attack', requireAuth, (req, res) => {
    const db = req.app.get('tprodb');
    const d = req.session.dungeon;

    if (!d || !d.inCombat || !d.monster || !req.user.status) {
        return res.redirect('/tprobbs/combat/dungeon');
    }

    const results = [];

    // Player attacks
    const playerDamage = calculateDamage(req.user, { armor: Math.floor(d.monster.id / 20) + 1 }, true);
    d.monster.hp -= playerDamage;
    results.push({ type: 'player', damage: playerDamage, target: d.monster.name });

    // Check if monster dead
    if (d.monster.hp <= 0) {
        const xp = calculateXP(d.level);
        const gold = calculateGold(d.level, req.user.charisma);

        db.prepare(`
            UPDATE users
            SET experience = experience + ?,
                gold = gold + ?
            WHERE id = ?
        `).run(xp, gold, req.user.id);

        // Check level up
        const updatedUser = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
        const levelResult = checkLevelUp(db, updatedUser);

        d.inCombat = false;
        d.monster = null;
        req.session.dungeon = d;

        return res.render('pages/combat/victory', {
            title: 'Victory!',
            user: req.user,
            xp,
            gold,
            levelUp: levelResult
        });
    }

    // Monster attacks
    const monsterDamage = calculateDamage(d.monster, req.user, false);
    const newHP = req.user.hit_points - monsterDamage;
    results.push({ type: 'monster', damage: monsterDamage, target: req.user.username });

    db.prepare('UPDATE users SET hit_points = ? WHERE id = ?')
        .run(Math.max(0, newHP), req.user.id);

    // Check if player dead
    if (newHP <= 0) {
        db.prepare('UPDATE users SET status = 0, hit_points = 0 WHERE id = ?')
            .run(req.user.id);

        d.inCombat = false;
        d.monster = null;
        req.session.dungeon = null;

        return res.render('pages/combat/defeat', {
            title: 'Defeat',
            user: { ...req.user, hit_points: 0, status: 0 },
            monster: d.monster
        });
    }

    req.session.dungeon = d;
    res.render('pages/combat/battle', {
        title: 'Combat',
        user: { ...req.user, hit_points: newHP },
        dungeon: d,
        results
    });
});

// Flee combat
router.post('/dungeon/flee', requireAuth, (req, res) => {
    const db = req.app.get('tprodb');
    const d = req.session.dungeon;

    if (!d || !d.inCombat) {
        return res.redirect('/tprobbs/combat/dungeon');
    }

    // Flee chance based on agility
    const fleeChance = 0.3 + (req.user.agility / 200);
    if (Math.random() < fleeChance) {
        d.inCombat = false;
        d.monster = null;
        req.session.dungeon = d;
        return res.redirect('/tprobbs/combat/dungeon');
    }

    // Failed to flee, monster attacks
    const monsterDamage = calculateDamage(d.monster, req.user, false);
    const newHP = req.user.hit_points - monsterDamage;

    db.prepare('UPDATE users SET hit_points = ? WHERE id = ?')
        .run(Math.max(0, newHP), req.user.id);

    if (newHP <= 0) {
        db.prepare('UPDATE users SET status = 0, hit_points = 0 WHERE id = ?')
            .run(req.user.id);
        req.session.dungeon = null;
        return res.render('pages/combat/defeat', {
            title: 'Defeat',
            user: { ...req.user, hit_points: 0, status: 0 },
            monster: d.monster
        });
    }

    req.session.dungeon = d;
    res.render('pages/combat/battle', {
        title: 'Combat',
        user: { ...req.user, hit_points: newHP },
        dungeon: d,
        results: [
            { type: 'flee', success: false },
            { type: 'monster', damage: monsterDamage, target: req.user.username }
        ]
    });
});

// Leave dungeon
router.get('/dungeon/leave', requireAuth, (req, res) => {
    req.session.dungeon = null;
    res.redirect('/tprobbs/combat');
});

// Arena menu
router.get('/arena', requireAuth, (req, res) => {
    if (!req.user.status) {
        return res.redirect('/tprobbs/combat');
    }

    const db = req.app.get('tprodb');

    // Get config for max fights
    const maxFights = parseInt(db.prepare("SELECT value FROM config WHERE key = 'max_fights_per_day'").get()?.value || '4', 10);

    // Get top 20 arena fighters
    const topFighters = db.prepare(`
        SELECT u.id, u.username, u.level, u.kills, u.killed, c.name as class_name
        FROM users u
        LEFT JOIN classes c ON u.class = c.id
        WHERE u.status = 1
        ORDER BY u.kills DESC, u.level DESC
        LIMIT 20
    `).all();

    // Get recent kills
    const recentKills = db.prepare(`
        SELECT ak.*,
               k.username as killer_name,
               v.username as victim_name
        FROM arena_kills ak
        LEFT JOIN users k ON ak.killer_id = k.id
        LEFT JOIN users v ON ak.victim_id = v.id
        ORDER BY ak.killed_at DESC
        LIMIT 10
    `).all();

    res.render('pages/combat/arena', {
        title: 'The Arena',
        user: req.user,
        topFighters,
        recentKills,
        maxFights,
        fightsRemaining: maxFights - req.user.arena_fights_today
    });
});

// Select opponent
router.get('/arena/fight', requireAuth, (req, res) => {
    if (!req.user.status) {
        return res.redirect('/tprobbs/combat');
    }

    const db = req.app.get('tprodb');

    // Get config
    const maxFights = parseInt(db.prepare("SELECT value FROM config WHERE key = 'max_fights_per_day'").get()?.value || '4', 10);
    const levelRange = parseInt(db.prepare("SELECT value FROM config WHERE key = 'fight_level_range'").get()?.value || '2', 10);

    if (req.user.arena_fights_today >= maxFights) {
        return res.render('pages/error', {
            status: 403,
            message: 'You have used all your arena fights for today.'
        });
    }

    // Get eligible opponents (within level range, alive, not self)
    const opponents = db.prepare(`
        SELECT u.id, u.username, u.level, u.class, c.name as class_name,
               u.kills, u.killed
        FROM users u
        LEFT JOIN classes c ON u.class = c.id
        WHERE u.status = 1
          AND u.id != ?
          AND u.level BETWEEN ? AND ?
        ORDER BY u.level DESC
        LIMIT 20
    `).all(req.user.id, req.user.level - levelRange, req.user.level + levelRange);

    res.render('pages/combat/pvp-select', {
        title: 'Select Opponent',
        user: req.user,
        opponents,
        fightsRemaining: maxFights - req.user.arena_fights_today
    });
});

// PvP combat
router.post('/arena/fight/:opponentId', requireAuth, (req, res) => {
    const db = req.app.get('tprodb');
    const opponentId = parseInt(req.params.opponentId, 10);

    if (!req.user.status) {
        return res.redirect('/tprobbs/combat');
    }

    // Get config
    const maxFights = parseInt(db.prepare("SELECT value FROM config WHERE key = 'max_fights_per_day'").get()?.value || '4', 10);

    if (req.user.arena_fights_today >= maxFights) {
        return res.render('pages/error', {
            status: 403,
            message: 'You have used all your arena fights for today.'
        });
    }

    // Get opponent
    const opponent = db.prepare(`
        SELECT u.*, c.name as class_name
        FROM users u
        LEFT JOIN classes c ON u.class = c.id
        WHERE u.id = ? AND u.status = 1
    `).get(opponentId);

    if (!opponent || opponent.id === req.user.id) {
        return res.render('pages/error', {
            status: 400,
            message: 'Invalid opponent'
        });
    }

    // Simulate combat (simplified - attacker advantage)
    const playerDamage = calculateDamage(req.user, opponent, true);
    const opponentDamage = calculateDamage(opponent, req.user, true);

    // Determine winner (higher damage wins, with some randomness)
    const playerScore = playerDamage * (0.8 + Math.random() * 0.4);
    const opponentScore = opponentDamage * (0.8 + Math.random() * 0.4);

    const playerWon = playerScore > opponentScore;

    // Update stats
    db.prepare('UPDATE users SET arena_fights_today = arena_fights_today + 1 WHERE id = ?')
        .run(req.user.id);

    if (playerWon) {
        // Player wins
        const xpGain = Math.floor(opponent.level * 100 * (1 + Math.random() * 0.5));
        const goldGain = Math.floor(opponent.gold * 0.1);

        db.prepare(`
            UPDATE users
            SET kills = kills + 1,
                experience = experience + ?,
                gold = gold + ?
            WHERE id = ?
        `).run(xpGain, goldGain, req.user.id);

        db.prepare(`
            UPDATE users
            SET killed = killed + 1,
                status = 0,
                hit_points = 0,
                ko_killer_id = ?,
                ko_timestamp = ?
            WHERE id = ?
        `).run(req.user.id, Date.now(), opponent.id);

        // Record kill
        db.prepare(`
            INSERT INTO arena_kills (killer_id, victim_id)
            VALUES (?, ?)
        `).run(req.user.id, opponent.id);

        res.render('pages/combat/pvp-result', {
            title: 'Victory!',
            user: req.user,
            opponent,
            won: true,
            xpGain,
            goldGain,
            playerDamage,
            opponentDamage
        });
    } else {
        // Player loses
        const goldLost = Math.floor(req.user.gold * 0.1);

        db.prepare(`
            UPDATE users
            SET killed = killed + 1,
                status = 0,
                hit_points = 0,
                ko_killer_id = ?,
                ko_timestamp = ?,
                gold = gold - ?
            WHERE id = ?
        `).run(opponent.id, Date.now(), goldLost, req.user.id);

        db.prepare(`
            UPDATE users
            SET kills = kills + 1
            WHERE id = ?
        `).run(opponent.id);

        // Record kill
        db.prepare(`
            INSERT INTO arena_kills (killer_id, victim_id)
            VALUES (?, ?)
        `).run(opponent.id, req.user.id);

        res.render('pages/combat/pvp-result', {
            title: 'Defeat',
            user: { ...req.user, status: 0, hit_points: 0 },
            opponent,
            won: false,
            goldLost,
            playerDamage,
            opponentDamage
        });
    }
});

module.exports = router;
