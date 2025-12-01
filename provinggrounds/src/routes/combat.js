/**
 * Combat Routes
 * User vs User, Dungeon, Corridor of Death, Castle Attacks
 */

const express = require('express');
const router = express.Router();

// Auth middleware
const requireAuth = (req, res, next) => {
    if (!req.session.userId) return res.redirect('/');
    next();
};

router.use(requireAuth);

// Combat menu
router.get('/', (req, res) => {
    const db = req.app.get('db');
    const user = db.prepare(`
        SELECT u.*, w.name as weapon_name, a.name as armor_name
        FROM users u
        LEFT JOIN weapons w ON u.weapon_id = w.id
        LEFT JOIN armor a ON u.armor_id = a.id
        WHERE u.id = ?
    `).get(req.session.userId);

    res.render('pages/combat/menu', {
        title: 'Dungeon',
        user,
        fightsRemaining: 4 - user.fights_today
    });
});

// Proving Grounds - User vs User
router.get('/proving-grounds', (req, res) => {
    const db = req.app.get('db');
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.session.userId);

    // Get fightable users (within level range)
    const fightLevel = parseInt(db.prepare("SELECT value FROM config WHERE key = 'fight_level_range'").get()?.value || '2');

    const opponents = db.prepare(`
        SELECT u.id, u.name, u.level, u.status, u.kills,
               w.name as weapon_name, a.name as armor_name,
               l.title as rank_title
        FROM users u
        LEFT JOIN weapons w ON u.weapon_id = w.id
        LEFT JOIN armor a ON u.armor_id = a.id
        LEFT JOIN levels l ON u.level = l.level
        WHERE u.id != ?
          AND u.status = 'Alive'
          AND (u.level >= ? - ? OR u.level > ?)
        ORDER BY u.level DESC
        LIMIT 20
    `).all(req.session.userId, user.level, fightLevel, user.level);

    res.render('pages/combat/proving-grounds', {
        title: 'Proving Grounds',
        user,
        opponents,
        fightsRemaining: 4 - user.fights_today
    });
});

// Fight user
router.post('/fight-user/:id', (req, res) => {
    const db = req.app.get('db');
    const opponentId = parseInt(req.params.id);

    // Validate opponentId is positive
    if (!opponentId || opponentId <= 0) {
        return res.redirect('/combat/proving-grounds');
    }

    const user = db.prepare(`
        SELECT u.*, w.power as weapon_power, a.power as armor_power
        FROM users u
        LEFT JOIN weapons w ON u.weapon_id = w.id
        LEFT JOIN armor a ON u.armor_id = a.id
        WHERE u.id = ?
    `).get(req.session.userId);

    // Verify opponent exists, is alive, and within level range
    const fightLevel = parseInt(db.prepare("SELECT value FROM config WHERE key = 'fight_level_range'").get()?.value || '2');

    const opponent = db.prepare(`
        SELECT u.*, w.power as weapon_power, a.power as armor_power
        FROM users u
        LEFT JOIN weapons w ON u.weapon_id = w.id
        LEFT JOIN armor a ON u.armor_id = a.id
        WHERE u.id = ?
          AND u.id != ?
          AND u.status = 'Alive'
          AND (u.level >= ? - ? OR u.level > ?)
    `).get(opponentId, req.session.userId, user.level, fightLevel, user.level);

    if (!opponent || user.fights_today >= 4) {
        return res.redirect('/combat/proving-grounds');
    }

    // Combat simulation
    const combatLog = [];
    let userHP = user.hp;
    let oppHP = opponent.hp;

    // Determine first attack
    const userFirst = user.agility > opponent.agility;
    combatLog.push(userFirst ? 'You get first attack!' : `${opponent.name} gets first attack!`);

    while (userHP > 0 && oppHP > 0) {
        if (userFirst || combatLog.length > 1) {
            // User attacks
            const hit = Math.random() * (user.weapon_power + user.agility) >
                       Math.random() * (opponent.weapon_power + opponent.agility) * 0.5;
            if (hit) {
                const damage = Math.floor((user.strength / 25 + 1) * user.weapon_power * (0.5 + Math.random() * 0.5));
                const absorbed = Math.floor(damage * (opponent.armor_power / 100));
                const actualDamage = Math.max(1, damage - absorbed);
                oppHP -= actualDamage;
                combatLog.push(`You strike ${opponent.name} for ${actualDamage} damage!`);
            } else {
                combatLog.push('You miss!');
            }
        }

        if (oppHP <= 0) break;

        // Opponent attacks
        const oppHit = Math.random() * (opponent.weapon_power + opponent.agility) >
                      Math.random() * (user.weapon_power + user.agility) * 0.5;
        if (oppHit) {
            const damage = Math.floor((opponent.strength / 25 + 1) * opponent.weapon_power * (0.5 + Math.random() * 0.5));
            const absorbed = Math.floor(damage * (user.armor_power / 100));
            const actualDamage = Math.max(1, damage - absorbed);
            userHP -= actualDamage;
            combatLog.push(`${opponent.name} strikes you for ${actualDamage} damage!`);
        } else {
            combatLog.push(`${opponent.name} misses!`);
        }
    }

    // Determine winner
    const userWon = oppHP <= 0;
    const goldGained = userWon ? opponent.gold : 0;
    const expGained = userWon ? Math.floor(opponent.experience * 0.1) : 0;

    // Update database
    db.prepare('UPDATE users SET fights_today = fights_today + 1 WHERE id = ?').run(req.session.userId);

    if (userWon) {
        db.prepare('UPDATE users SET gold = gold + ?, experience = experience + ?, hp = ? WHERE id = ?')
            .run(goldGained, expGained, Math.max(1, userHP), req.session.userId);
        db.prepare("UPDATE users SET gold = 0, status = 'Dead', hp = 0 WHERE id = ?").run(opponentId);
        combatLog.push(`You have defeated ${opponent.name}!`);
        combatLog.push(`Gold gained: ${goldGained}`);
        combatLog.push(`Experience gained: ${expGained}`);
    } else {
        db.prepare("UPDATE users SET gold = 0, status = 'Dead', hp = 0 WHERE id = ?").run(req.session.userId);
        combatLog.push(`${opponent.name} has defeated you!`);
    }

    // Log fight
    db.prepare(`
        INSERT INTO fight_log (attacker_id, defender_id, winner, gold_gained, experience_gained)
        VALUES (?, ?, ?, ?, ?)
    `).run(req.session.userId, opponentId, userWon ? 'attacker' : 'defender', goldGained, expGained);

    const updatedUser = db.prepare('SELECT * FROM users WHERE id = ?').get(req.session.userId);

    res.render('pages/combat/user-result', {
        title: 'Combat Result',
        won: userWon,
        user: updatedUser,
        opponent,
        log: combatLog.map(text => ({ text, type: text.includes('damage') ? 'combat-hit' : 'combat-miss' })),
        goldStolen: goldGained,
        goldLost: userWon ? 0 : user.gold,
        expEarned: expGained
    });
});

// Dungeon - Monster fighting
router.get('/dungeon', (req, res) => {
    const db = req.app.get('db');
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.session.userId);

    res.render('pages/combat/dungeon', {
        title: 'Dungeon',
        user
    });
});

// Search for monster in dungeon
router.post('/dungeon/search', (req, res) => {
    const db = req.app.get('db');
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.session.userId);

    // Get random monster based on user level
    const monsterLevel = Math.max(1, Math.min(10, Math.floor(user.level / 10) + 1));
    const monster = db.prepare(`
        SELECT * FROM monsters WHERE level = ? ORDER BY RANDOM() LIMIT 1
    `).get(monsterLevel);

    if (!monster) return res.redirect('/combat/dungeon');

    // Initialize battle state
    req.session.battle = {
        enemy: monster,
        enemyHp: monster.hp,
        userHp: user.hp,
        userPower: user.power,
        status: 'fighting',
        log: [{ text: `A wild ${monster.name} appears!`, type: '' }]
    };

    res.redirect('/combat/battle');
});

// Battle page (shared for monsters)
router.get('/battle', (req, res) => {
    const battle = req.session.battle;
    if (!battle) return res.redirect('/combat/dungeon');

    const db = req.app.get('db');
    const user = db.prepare(`
        SELECT u.*, w.name as weapon_name, w.power as weapon_power,
               a.name as armor_name, a.power as armor_power,
               l.title as rank_title
        FROM users u
        LEFT JOIN weapons w ON u.weapon_id = w.id
        LEFT JOIN armor a ON u.armor_id = a.id
        LEFT JOIN levels l ON u.level = l.level
        WHERE u.id = ?
    `).get(req.session.userId);

    // Get user's battle spells
    const battleSpells = db.prepare(`
        SELECT s.* FROM spells s
        JOIN user_spells us ON s.id = us.spell_id
        WHERE us.user_id = ? AND s.is_battle = 1
    `).all(req.session.userId);

    res.render('pages/combat/battle', {
        title: 'Battle',
        user,
        battle,
        battleSpells
    });
});

// Attack action
router.post('/battle/attack', (req, res) => {
    const battle = req.session.battle;
    if (!battle || battle.status !== 'fighting') return res.redirect('/combat/dungeon');

    const db = req.app.get('db');
    const user = db.prepare(`
        SELECT u.*, w.power as weapon_power, a.power as armor_power
        FROM users u
        LEFT JOIN weapons w ON u.weapon_id = w.id
        LEFT JOIN armor a ON u.armor_id = a.id
        WHERE u.id = ?
    `).get(req.session.userId);

    // User attacks
    const userDamage = Math.floor(Math.random() * (user.weapon_power + user.strength / 10) + 1);
    battle.enemyHp -= userDamage;
    battle.log.push({ text: `You deal ${userDamage} damage to ${battle.enemy.name}!`, type: 'combat-hit' });

    // Check if enemy died
    if (battle.enemyHp <= 0) {
        battle.status = 'victory';
        const goldReward = battle.enemy.gold;
        const expReward = battle.enemy.experience;

        db.prepare('UPDATE users SET gold = gold + ?, experience = experience + ?, monsters_killed = monsters_killed + 1 WHERE id = ?')
            .run(goldReward, expReward, req.session.userId);

        battle.goldReward = goldReward;
        battle.expReward = expReward;

        // Check for level up
        const updatedUser = db.prepare('SELECT * FROM users WHERE id = ?').get(req.session.userId);
        const nextLevel = db.prepare('SELECT * FROM levels WHERE level = ?').get(updatedUser.level + 1);
        if (nextLevel && updatedUser.experience >= nextLevel.experience_required) {
            db.prepare(`
                UPDATE users SET level = level + 1,
                    max_hp = max_hp + 10, hp = hp + 10,
                    max_power = max_power + 5, power = power + 5,
                    strength = strength + 2, agility = agility + 2
                WHERE id = ?
            `).run(req.session.userId);
            battle.levelUp = true;
        }
    } else {
        // Enemy attacks back
        const enemyDamage = Math.max(1, Math.floor(Math.random() * battle.enemy.strength - user.armor_power / 2));
        battle.userHp -= enemyDamage;
        battle.log.push({ text: `${battle.enemy.name} deals ${enemyDamage} damage to you!`, type: 'combat-hit' });

        // Update user HP in database
        db.prepare('UPDATE users SET hp = ? WHERE id = ?').run(Math.max(0, battle.userHp), req.session.userId);

        if (battle.userHp <= 0) {
            battle.status = 'defeat';
            db.prepare("UPDATE users SET status = 'Dead', hp = 0 WHERE id = ?").run(req.session.userId);
        }
    }

    res.redirect('/combat/battle');
});

// Cast spell in battle
router.post('/battle/spell/:id', (req, res) => {
    const battle = req.session.battle;
    if (!battle || battle.status !== 'fighting') return res.redirect('/combat/dungeon');

    const db = req.app.get('db');
    const spellId = parseInt(req.params.id);

    // Validate spellId is positive
    if (!spellId || spellId <= 0) return res.redirect('/combat/battle');

    const spell = db.prepare('SELECT * FROM spells WHERE id = ?').get(spellId);

    if (!spell) return res.redirect('/combat/battle');

    // Verify user owns this spell with quantity > 0
    const userSpell = db.prepare('SELECT quantity FROM user_spells WHERE user_id = ? AND spell_id = ? AND quantity > 0')
        .get(req.session.userId, spellId);

    if (!userSpell) {
        battle.log.push({ text: 'You do not have that spell!', type: 'combat-miss' });
        return res.redirect('/combat/battle');
    }

    // Validate spell cost is positive (prevent negative cost exploits)
    if (spell.cost <= 0) return res.redirect('/combat/battle');

    // Check power
    if (battle.userPower < spell.cost) {
        battle.log.push({ text: 'Not enough power to cast spell!', type: 'combat-miss' });
        return res.redirect('/combat/battle');
    }

    battle.userPower -= spell.cost;
    db.prepare('UPDATE users SET power = power - ? WHERE id = ?').run(spell.cost, req.session.userId);

    const damage = spell.power + Math.floor(Math.random() * 10);
    battle.enemyHp -= damage;
    battle.log.push({ text: `You cast ${spell.name} for ${damage} damage!`, type: 'combat-hit' });

    if (battle.enemyHp <= 0) {
        battle.status = 'victory';
        const goldReward = battle.enemy.gold;
        const expReward = battle.enemy.experience;

        db.prepare('UPDATE users SET gold = gold + ?, experience = experience + ?, monsters_killed = monsters_killed + 1 WHERE id = ?')
            .run(goldReward, expReward, req.session.userId);

        battle.goldReward = goldReward;
        battle.expReward = expReward;
    }

    res.redirect('/combat/battle');
});

// Run from battle
router.post('/battle/run', (req, res) => {
    const battle = req.session.battle;
    if (!battle || battle.status !== 'fighting') return res.redirect('/combat/dungeon');

    // 50% chance to escape
    if (Math.random() > 0.5) {
        battle.status = 'fled';
        battle.log.push({ text: 'You escaped!', type: '' });
    } else {
        // Failed to escape, enemy gets free hit
        const db = req.app.get('db');
        const user = db.prepare('SELECT a.power as armor_power FROM users u LEFT JOIN armor a ON u.armor_id = a.id WHERE u.id = ?')
            .get(req.session.userId);

        const enemyDamage = Math.max(1, Math.floor(Math.random() * battle.enemy.strength - (user.armor_power || 0) / 2));
        battle.userHp -= enemyDamage;
        battle.log.push({ text: 'You failed to escape!', type: 'combat-miss' });
        battle.log.push({ text: `${battle.enemy.name} hits you for ${enemyDamage} while fleeing!`, type: 'combat-hit' });

        db.prepare('UPDATE users SET hp = ? WHERE id = ?').run(Math.max(0, battle.userHp), req.session.userId);

        if (battle.userHp <= 0) {
            battle.status = 'defeat';
            db.prepare("UPDATE users SET status = 'Dead', hp = 0 WHERE id = ?").run(req.session.userId);
        }
    }

    res.redirect('/combat/battle');
});

// Corridor of Death
router.get('/corridor', (req, res) => {
    const db = req.app.get('db');
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.session.userId);

    res.render('pages/combat/corridor', {
        title: 'Corridor of Death',
        user
    });
});

router.post('/corridor/enter', (req, res) => {
    // TODO: Implement corridor of death
    res.redirect('/combat/corridor');
});

// Castle Attack
router.get('/castle', (req, res) => {
    const db = req.app.get('db');
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.session.userId);

    res.render('pages/combat/castle', {
        title: 'Castle Attack',
        user
    });
});

router.post('/castle/attack', (req, res) => {
    // TODO: Implement castle attack
    res.redirect('/combat/castle');
});

module.exports = router;
