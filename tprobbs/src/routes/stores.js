/**
 * TPro BBS Stores Routes (Weapons, Armor, Spells, Homes, Security, Bank)
 */

const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');

// Calculate sell price based on charisma
function sellPrice(price, charisma) {
    return Math.floor(price * (50 + charisma / 2) / 100);
}

// Stores menu
router.get('/', requireAuth, (req, res) => {
    res.render('pages/stores/menu', {
        title: 'Stores',
        user: req.user
    });
});

// Weapons store
router.get('/weapons', requireAuth, (req, res) => {
    const db = req.app.get('tprodb');
    const weapons = db.prepare('SELECT id, name, price, id as level FROM weapons ORDER BY id').all();
    const currentWeapon = db.prepare('SELECT id, name, price, id as level FROM weapons WHERE id = ?').get(req.user.weapon);

    res.render('pages/stores/weapons', {
        title: 'Weapon Store',
        user: req.user,
        weapons,
        currentWeapon,
        tradeInValue: sellPrice(currentWeapon?.price || 0, req.user.charisma),
        message: req.query.message || null,
        messageType: req.query.type || 'success'
    });
});

router.post('/weapons/buy/:id', requireAuth, (req, res) => {
    const db = req.app.get('tprodb');
    const weaponId = parseInt(req.params.id, 10);

    const weapon = db.prepare('SELECT * FROM weapons WHERE id = ?').get(weaponId);
    if (!weapon) {
        return res.redirect('/tprobbs/stores/weapons?message=Invalid weapon');
    }

    if (weapon.price > req.user.gold) {
        return res.redirect('/tprobbs/stores/weapons?message=Not enough gold');
    }

    if (weaponId <= req.user.weapon) {
        return res.redirect('/tprobbs/stores/weapons?message=You already have a better weapon');
    }

    // Sell old weapon, buy new one
    const sellValue = sellPrice(req.user.weapon_price || 0, req.user.charisma);
    const cost = weapon.price - sellValue;

    if (cost > req.user.gold) {
        return res.redirect('/tprobbs/stores/weapons?message=Not enough gold (after trade-in)');
    }

    db.prepare('UPDATE users SET weapon = ?, gold = gold - ? WHERE id = ?')
        .run(weaponId, cost, req.user.id);

    res.redirect(`/tprobbs/stores/weapons?message=Purchased ${weapon.name}!`);
});

// Armor store
router.get('/armor', requireAuth, (req, res) => {
    const db = req.app.get('tprodb');
    const armors = db.prepare('SELECT id, name, price, id as level FROM armor ORDER BY id').all();
    const currentArmor = db.prepare('SELECT id, name, price, id as level FROM armor WHERE id = ?').get(req.user.armor);

    res.render('pages/stores/armor', {
        title: 'Armor Store',
        user: req.user,
        armors,
        currentArmor,
        tradeInValue: sellPrice(currentArmor?.price || 0, req.user.charisma),
        message: req.query.message || null,
        messageType: req.query.type || 'success'
    });
});

router.post('/armor/buy/:id', requireAuth, (req, res) => {
    const db = req.app.get('tprodb');
    const armorId = parseInt(req.params.id, 10);

    const armor = db.prepare('SELECT * FROM armor WHERE id = ?').get(armorId);
    if (!armor) {
        return res.redirect('/tprobbs/stores/armor?message=Invalid armor');
    }

    if (armorId <= req.user.armor) {
        return res.redirect('/tprobbs/stores/armor?message=You already have better armor');
    }

    const sellValue = sellPrice(req.user.armor_price || 0, req.user.charisma);
    const cost = armor.price - sellValue;

    if (cost > req.user.gold) {
        return res.redirect('/tprobbs/stores/armor?message=Not enough gold');
    }

    db.prepare('UPDATE users SET armor = ?, gold = gold - ? WHERE id = ?')
        .run(armorId, cost, req.user.id);

    res.redirect(`/tprobbs/stores/armor?message=Purchased ${armor.name}!`);
});

// Spell store
router.get('/spells', requireAuth, (req, res) => {
    const db = req.app.get('tprodb');
    const spells = db.prepare('SELECT * FROM spells ORDER BY id').all();
    const basePrice = db.prepare('SELECT price FROM weapons WHERE id = 1').get()?.price || 1;

    // Calculate actual prices
    const spellsWithPrices = spells.map(s => ({
        ...s,
        price: Math.floor(s.price_multiplier * basePrice),
        owned: (req.user.spells & (1 << (s.id - 1))) !== 0
    }));

    res.render('pages/stores/spells', {
        title: 'Magic Shop',
        user: req.user,
        spells: spellsWithPrices,
        message: req.query.message || null
    });
});

router.post('/spells/buy/:id', requireAuth, (req, res) => {
    const db = req.app.get('tprodb');
    const spellId = parseInt(req.params.id, 10);

    const spell = db.prepare('SELECT * FROM spells WHERE id = ?').get(spellId);
    if (!spell) {
        return res.redirect('/tprobbs/stores/spells?message=Invalid spell');
    }

    // Check if already owned
    const spellMask = 1 << (spellId - 1);
    if ((req.user.spells & spellMask) !== 0) {
        return res.redirect('/tprobbs/stores/spells?message=You already know this spell');
    }

    const basePrice = db.prepare('SELECT price FROM weapons WHERE id = 1').get()?.price || 1;
    const price = Math.floor(spell.price_multiplier * basePrice);

    if (price > req.user.gold) {
        return res.redirect('/tprobbs/stores/spells?message=Not enough gold');
    }

    db.prepare('UPDATE users SET spells = spells | ?, gold = gold - ? WHERE id = ?')
        .run(spellMask, price, req.user.id);

    res.redirect(`/tprobbs/stores/spells?message=Learned ${spell.name}!`);
});

// Homes store
router.get('/homes', requireAuth, (req, res) => {
    const db = req.app.get('tprodb');
    const homes = db.prepare('SELECT id, name, price, id as level, (id * 5) as protection FROM homes ORDER BY id').all();
    const currentHome = db.prepare('SELECT id, name, price, id as level, (id * 5) as protection FROM homes WHERE id = ?').get(req.user.home);

    res.render('pages/stores/homes', {
        title: 'Real Estate',
        user: req.user,
        homes,
        currentHome,
        message: req.query.message || null,
        messageType: req.query.type || 'success'
    });
});

router.post('/homes/buy/:id', requireAuth, (req, res) => {
    const db = req.app.get('tprodb');
    const homeId = parseInt(req.params.id, 10);

    const home = db.prepare('SELECT * FROM homes WHERE id = ?').get(homeId);
    if (!home) {
        return res.redirect('/tprobbs/stores/homes?message=Invalid home');
    }

    if (homeId <= req.user.home) {
        return res.redirect('/tprobbs/stores/homes?message=You already have a better home');
    }

    const currentHome = db.prepare('SELECT * FROM homes WHERE id = ?').get(req.user.home || 0);
    const sellValue = sellPrice(currentHome?.price || 0, req.user.charisma);
    const cost = home.price - sellValue;

    if (cost > req.user.gold) {
        return res.redirect('/tprobbs/stores/homes?message=Not enough gold');
    }

    db.prepare('UPDATE users SET home = ?, gold = gold - ? WHERE id = ?')
        .run(homeId, cost, req.user.id);

    res.redirect(`/tprobbs/stores/homes?message=Purchased ${home.name}!`);
});

// Security store
router.get('/security', requireAuth, (req, res) => {
    const db = req.app.get('tprodb');
    const systems = db.prepare('SELECT id, name, price, id as level, (id * 3) as protection FROM security ORDER BY id').all();
    const currentSecurity = db.prepare('SELECT id, name, price, id as level, (id * 3) as protection FROM security WHERE id = ?').get(req.user.security);

    res.render('pages/stores/security', {
        title: 'Security Store',
        user: req.user,
        systems,
        currentSecurity,
        message: req.query.message || null,
        messageType: req.query.type || 'success'
    });
});

router.post('/security/buy/:id', requireAuth, (req, res) => {
    const db = req.app.get('tprodb');
    const securityId = parseInt(req.params.id, 10);

    const security = db.prepare('SELECT * FROM security WHERE id = ?').get(securityId);
    if (!security) {
        return res.redirect('/tprobbs/stores/security?message=Invalid security');
    }

    if (securityId <= req.user.security) {
        return res.redirect('/tprobbs/stores/security?message=You already have better security');
    }

    const currentSecurity = db.prepare('SELECT * FROM security WHERE id = ?').get(req.user.security || 0);
    const sellValue = sellPrice(currentSecurity?.price || 0, req.user.charisma);
    const cost = security.price - sellValue;

    if (cost > req.user.gold) {
        return res.redirect('/tprobbs/stores/security?message=Not enough gold');
    }

    db.prepare('UPDATE users SET security = ?, gold = gold - ? WHERE id = ?')
        .run(securityId, cost, req.user.id);

    res.redirect(`/tprobbs/stores/security?message=Purchased ${security.name}!`);
});

// Bank
router.get('/bank', requireAuth, (req, res) => {
    res.render('pages/stores/bank', {
        title: 'Bank',
        user: req.user,
        message: req.query.message || null,
        messageType: req.query.type || 'success'
    });
});

router.post('/bank/deposit', requireAuth, (req, res) => {
    const db = req.app.get('tprodb');
    const amount = parseInt(req.body.amount, 10) || 0;

    if (amount <= 0) {
        return res.redirect('/tprobbs/stores/bank?message=Invalid amount');
    }

    if (amount > req.user.gold) {
        return res.redirect('/tprobbs/stores/bank?message=Not enough gold');
    }

    db.prepare('UPDATE users SET gold = gold - ?, bank = bank + ? WHERE id = ?')
        .run(amount, amount, req.user.id);

    res.redirect(`/tprobbs/stores/bank?message=Deposited ${amount} gold`);
});

router.post('/bank/withdraw', requireAuth, (req, res) => {
    const db = req.app.get('tprodb');
    const amount = parseInt(req.body.amount, 10) || 0;

    if (amount <= 0) {
        return res.redirect('/tprobbs/stores/bank?message=Invalid amount');
    }

    if (amount > req.user.bank) {
        return res.redirect('/tprobbs/stores/bank?message=Not enough in bank');
    }

    db.prepare('UPDATE users SET gold = gold + ?, bank = bank - ? WHERE id = ?')
        .run(amount, amount, req.user.id);

    res.redirect(`/tprobbs/stores/bank?message=Withdrew ${amount} gold`);
});

// Healer
router.get('/healer', requireAuth, (req, res) => {
    const healCost = Math.max(1, Math.floor((req.user.max_hp - req.user.hit_points) * req.user.level));
    const manaCost = Math.max(1, Math.floor((req.user.max_sp - req.user.spell_power) * req.user.level * 2));
    const resurrectionCost = Math.floor(req.user.level * 1000);

    res.render('pages/stores/healer', {
        title: 'Healer',
        user: req.user,
        healCost,
        manaCost,
        resurrectionCost,
        message: req.query.message || null,
        messageType: req.query.type || 'success'
    });
});

router.post('/healer/heal', requireAuth, (req, res) => {
    const db = req.app.get('tprodb');

    if (req.user.hit_points >= req.user.max_hp) {
        return res.redirect('/tprobbs/stores/healer?message=Already at full health');
    }

    const healCost = Math.max(1, Math.floor((req.user.max_hp - req.user.hit_points) * req.user.level));

    if (healCost > req.user.gold) {
        return res.redirect('/tprobbs/stores/healer?message=Not enough gold');
    }

    db.prepare('UPDATE users SET hit_points = max_hp, gold = gold - ? WHERE id = ?')
        .run(healCost, req.user.id);

    res.redirect('/tprobbs/stores/healer?message=Fully healed!');
});

router.post('/healer/restore', requireAuth, (req, res) => {
    const db = req.app.get('tprodb');

    if (req.user.spell_power >= req.user.max_sp) {
        return res.redirect('/tprobbs/stores/healer?message=Already at full spell power');
    }

    const spCost = Math.max(1, Math.floor((req.user.max_sp - req.user.spell_power) * req.user.level * 2));

    if (spCost > req.user.gold) {
        return res.redirect('/tprobbs/stores/healer?message=Not enough gold');
    }

    db.prepare('UPDATE users SET spell_power = max_sp, gold = gold - ? WHERE id = ?')
        .run(spCost, req.user.id);

    res.redirect('/tprobbs/stores/healer?message=Spell power restored!');
});

router.post('/healer/resurrect', requireAuth, (req, res) => {
    const db = req.app.get('tprodb');

    if (req.user.status === 1) {
        return res.redirect('/tprobbs/stores/healer?message=You are not dead');
    }

    const resurrectCost = Math.floor(req.user.level * 1000);

    if (resurrectCost > req.user.bank) {
        return res.redirect('/tprobbs/stores/healer?message=Not enough gold in bank');
    }

    db.prepare(`
        UPDATE users
        SET status = 1,
            hit_points = max_hp,
            spell_power = max_sp,
            bank = bank - ?
        WHERE id = ?
    `).run(resurrectCost, req.user.id);

    res.redirect('/tprobbs/stores/healer?message=You have been resurrected!');
});

module.exports = router;
