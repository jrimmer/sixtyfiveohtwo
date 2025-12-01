/**
 * Store Routes
 * Weapons, Armor, Spells, Healing, Food
 */

const express = require('express');
const router = express.Router();

const requireAuth = (req, res, next) => {
    if (!req.session.userId) return res.redirect('/');
    next();
};

router.use(requireAuth);

// Store menu
router.get('/', (req, res) => {
    const db = req.app.get('db');
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.session.userId);

    res.render('pages/stores/menu', {
        title: 'The Bazaar',
        user
    });
});

// Weapons shop
router.get('/weapons', (req, res) => {
    const db = req.app.get('db');
    const user = db.prepare(`
        SELECT u.*, w.name as weapon_name, w.power as weapon_power
        FROM users u
        LEFT JOIN weapons w ON u.weapon_id = w.id
        WHERE u.id = ?
    `).get(req.session.userId);
    const weapons = db.prepare('SELECT * FROM weapons WHERE magical = 0 ORDER BY price').all();

    res.render('pages/stores/weapons', {
        title: 'Ye Old Battle Shop - Weapons',
        user,
        weapons
    });
});

router.post('/weapons/buy/:id', (req, res) => {
    const db = req.app.get('db');
    const weaponId = parseInt(req.params.id);

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.session.userId);
    const weapon = db.prepare('SELECT * FROM weapons WHERE id = ?').get(weaponId);

    if (!weapon || user.gold < weapon.price) {
        return res.redirect('/stores/weapons?error=insufficient_gold');
    }

    db.prepare('UPDATE users SET gold = gold - ?, weapon_id = ? WHERE id = ?')
        .run(weapon.price, weaponId, req.session.userId);

    res.redirect('/stores/weapons?success=1');
});

// Armor shop
router.get('/armor', (req, res) => {
    const db = req.app.get('db');
    const user = db.prepare(`
        SELECT u.*, a.name as armor_name, a.power as armor_power
        FROM users u
        LEFT JOIN armor a ON u.armor_id = a.id
        WHERE u.id = ?
    `).get(req.session.userId);
    const armor = db.prepare('SELECT * FROM armor WHERE magical = 0 ORDER BY price').all();

    res.render('pages/stores/armor', {
        title: 'Ye Old Battle Shop - Armor',
        user,
        armor
    });
});

router.post('/armor/buy/:id', (req, res) => {
    const db = req.app.get('db');
    const armorId = parseInt(req.params.id);

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.session.userId);
    const armor = db.prepare('SELECT * FROM armor WHERE id = ?').get(armorId);

    if (!armor || user.gold < armor.price) {
        return res.redirect('/stores/armor?error=insufficient_gold');
    }

    db.prepare('UPDATE users SET gold = gold - ?, armor_id = ? WHERE id = ?')
        .run(armor.price, armorId, req.session.userId);

    res.redirect('/stores/armor?success=1');
});

// Spells shop
router.get('/spells', (req, res) => {
    const db = req.app.get('db');
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.session.userId);
    const spells = db.prepare('SELECT * FROM spells ORDER BY price').all();

    // Get user's owned spells with full spell info
    const userSpells = db.prepare(`
        SELECT s.*, us.quantity
        FROM user_spells us
        JOIN spells s ON us.spell_id = s.id
        WHERE us.user_id = ? AND us.quantity > 0
    `).all(req.session.userId);

    // Build a set of owned spell IDs
    const ownedSpellIds = new Set(userSpells.map(s => s.id));

    // Mark spells as owned
    for (const spell of spells) {
        spell.owned = ownedSpellIds.has(spell.id);
    }

    res.render('pages/stores/spells', {
        title: 'Magical Spells',
        user,
        spells,
        userSpells
    });
});

router.post('/spells/buy/:id', (req, res) => {
    const db = req.app.get('db');
    const spellId = parseInt(req.params.id);
    const quantity = parseInt(req.body.quantity) || 1;

    // Validate quantity is positive
    if (quantity <= 0) {
        return res.redirect('/stores/spells?error=invalid');
    }

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.session.userId);
    const spell = db.prepare('SELECT * FROM spells WHERE id = ?').get(spellId);

    if (!spell) {
        return res.redirect('/stores/spells?error=1');
    }

    const currentQty = db.prepare('SELECT quantity FROM user_spells WHERE user_id = ? AND spell_id = ?')
        .get(req.session.userId, spellId)?.quantity || 0;

    const totalCost = spell.price * quantity;

    if (user.gold < totalCost || currentQty + quantity > 9) {
        return res.redirect('/stores/spells?error=1');
    }

    db.prepare('UPDATE users SET gold = gold - ? WHERE id = ?').run(totalCost, req.session.userId);
    db.prepare('UPDATE user_spells SET quantity = quantity + ? WHERE user_id = ? AND spell_id = ?')
        .run(quantity, req.session.userId, spellId);

    res.redirect('/stores/spells?success=1');
});

// Healing (Witch Hilda)
router.get('/healing', (req, res) => {
    const db = req.app.get('db');
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.session.userId);

    const hpCost = 50;
    const powerCost = 50;
    const hpNeeded = user.max_hp - user.hp;
    const powerNeeded = user.max_power - user.power;
    const fullCost = (hpNeeded + powerNeeded) * 50;

    res.render('pages/stores/healing', {
        title: 'Magical Healings',
        user,
        hpCost,
        powerCost,
        fullCost
    });
});

router.post('/healing/hp', (req, res) => {
    const db = req.app.get('db');
    const amount = parseInt(req.body.amount) || 0;

    // Validate amount is positive
    if (amount <= 0) {
        return res.redirect('/stores/healing?error=invalid');
    }

    const cost = amount * 50;

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.session.userId);

    if (user.gold < cost || user.hp + amount > user.max_hp) {
        return res.redirect('/stores/healing?error=1');
    }

    db.prepare('UPDATE users SET gold = gold - ?, hp = hp + ? WHERE id = ?')
        .run(cost, amount, req.session.userId);

    res.redirect('/stores/healing?success=1');
});

router.post('/healing/power', (req, res) => {
    const db = req.app.get('db');
    const amount = parseInt(req.body.amount) || 0;

    // Validate amount is positive
    if (amount <= 0) {
        return res.redirect('/stores/healing?error=invalid');
    }

    const cost = amount * 50;

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.session.userId);

    if (user.gold < cost || user.power + amount > user.max_power) {
        return res.redirect('/stores/healing?error=1');
    }

    db.prepare('UPDATE users SET gold = gold - ?, power = power + ? WHERE id = ?')
        .run(cost, amount, req.session.userId);

    res.redirect('/stores/healing?success=1');
});

router.post('/healing/full', (req, res) => {
    const db = req.app.get('db');
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.session.userId);

    const hpNeeded = user.max_hp - user.hp;
    const powerNeeded = user.max_power - user.power;
    const cost = (hpNeeded + powerNeeded) * 50;

    if (user.gold < cost) {
        return res.redirect('/stores/healing?error=1');
    }

    db.prepare('UPDATE users SET gold = gold - ?, hp = max_hp, power = max_power WHERE id = ?')
        .run(cost, req.session.userId);

    res.redirect('/stores/healing?success=1');
});

// Food (Ronald's Roach Burgers)
router.get('/food', (req, res) => {
    const db = req.app.get('db');
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.session.userId);
    const foodPrice = user.level * 2;

    res.render('pages/stores/food', {
        title: "Ronald's Roach Burgers",
        user,
        foodPrice
    });
});

router.post('/food/buy', (req, res) => {
    const db = req.app.get('db');
    const amount = parseInt(req.body.amount) || 0;

    // Validate amount is positive
    if (amount <= 0) {
        return res.redirect('/stores/food?error=invalid');
    }

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.session.userId);
    const cost = user.level * 2 * amount;

    if (user.gold < cost) {
        return res.redirect('/stores/food?error=1');
    }

    db.prepare('UPDATE users SET gold = gold - ?, food = food + ? WHERE id = ?')
        .run(cost, amount, req.session.userId);

    res.redirect('/stores/food?success=1');
});

module.exports = router;
