/**
 * Games Routes
 * Gambling (Slots, Blackjack, Roulette, Russian Roulette) and Jousting
 */

const express = require('express');
const router = express.Router();

const requireAuth = (req, res, next) => {
    if (!req.session.userId) return res.redirect('/provinggrounds/');
    next();
};

router.use(requireAuth);

// Games menu
router.get('/', (req, res) => {
    const db = req.app.get('db');
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.session.userId);

    res.render('pages/games/menu', {
        title: "Rebel's Hideout",
        user
    });
});

// Slots
router.get('/slots', (req, res) => {
    const db = req.app.get('db');
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.session.userId);

    res.render('pages/games/slots', {
        title: 'Slot Machines',
        user
    });
});

router.post('/slots/play', (req, res) => {
    const db = req.app.get('db');
    const bet = parseInt(req.body.bet) || 0;
    const wheels = parseInt(req.body.wheels) || 3;

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.session.userId);

    if (bet <= 0 || bet > user.gold || wheels < 3 || wheels > 5) {
        return res.redirect('/provinggrounds/games/slots?error=1');
    }

    // Spin the wheels
    const results = [];
    for (let i = 0; i < wheels; i++) {
        results.push(Math.floor(Math.random() * 9) + 1);
    }

    // Count matches
    const counts = {};
    for (const r of results) {
        counts[r] = (counts[r] || 0) + 1;
    }

    let maxMatch = 0;
    for (const c of Object.values(counts)) {
        if (c > maxMatch) maxMatch = c;
    }

    // Calculate winnings
    let multiplier = 0;
    const minMatch = Math.floor(wheels / 2) + 1;

    if (maxMatch >= minMatch) {
        if (wheels === 3) {
            multiplier = maxMatch === 2 ? 2.75 : 81;
        } else if (wheels === 4) {
            multiplier = maxMatch === 3 ? 36 : 400;
        } else {
            multiplier = maxMatch === 3 ? 10 : (maxMatch === 4 ? 250 : 4000);
        }
    }

    const winnings = Math.floor(bet * multiplier);
    const netGain = winnings - bet;

    db.prepare('UPDATE users SET gold = gold + ? WHERE id = ?').run(netGain, req.session.userId);

    res.render('pages/games/slots-result', {
        title: 'Slot Results',
        results,
        bet,
        winnings,
        netGain,
        maxMatch,
        user: { ...user, gold: user.gold + netGain }
    });
});

// Blackjack
router.get('/blackjack', (req, res) => {
    const db = req.app.get('db');
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.session.userId);

    res.render('pages/games/blackjack', {
        title: 'Blackjack',
        user,
        game: req.session.blackjackGame || null
    });
});

router.post('/blackjack/start', (req, res) => {
    const db = req.app.get('db');
    const bet = parseInt(req.body.bet) || 0;

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.session.userId);

    if (bet <= 0 || bet > user.gold) {
        return res.redirect('/provinggrounds/games/blackjack?error=1');
    }

    // Create deck and shuffle
    const suits = ['H', 'D', 'C', 'S'];
    const values = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
    const deck = [];

    for (const suit of suits) {
        for (const value of values) {
            deck.push({ suit, value });
        }
    }

    // Shuffle
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }

    // Deal cards
    const playerHand = [deck.pop(), deck.pop()];
    const dealerHand = [deck.pop(), deck.pop()];

    req.session.blackjackGame = {
        deck,
        playerHand,
        dealerHand,
        bet,
        status: 'playing'
    };

    res.redirect('/provinggrounds/games/blackjack');
});

function getHandValue(hand) {
    let value = 0;
    let aces = 0;

    for (const card of hand) {
        if (card.value === 'A') {
            aces++;
            value += 11;
        } else if (['K', 'Q', 'J'].includes(card.value)) {
            value += 10;
        } else {
            value += parseInt(card.value);
        }
    }

    while (value > 21 && aces > 0) {
        value -= 10;
        aces--;
    }

    return value;
}

router.post('/blackjack/hit', (req, res) => {
    const game = req.session.blackjackGame;
    if (!game || game.status !== 'playing') {
        return res.redirect('/provinggrounds/games/blackjack');
    }

    game.playerHand.push(game.deck.pop());

    if (getHandValue(game.playerHand) > 21) {
        game.status = 'bust';
        const db = req.app.get('db');
        db.prepare('UPDATE users SET gold = gold - ? WHERE id = ?').run(game.bet, req.session.userId);
    }

    res.redirect('/provinggrounds/games/blackjack');
});

router.post('/blackjack/stand', (req, res) => {
    const game = req.session.blackjackGame;
    if (!game || game.status !== 'playing') {
        return res.redirect('/provinggrounds/games/blackjack');
    }

    // Dealer plays
    while (getHandValue(game.dealerHand) < 17) {
        game.dealerHand.push(game.deck.pop());
    }

    const playerValue = getHandValue(game.playerHand);
    const dealerValue = getHandValue(game.dealerHand);

    const db = req.app.get('db');

    if (dealerValue > 21 || playerValue > dealerValue) {
        game.status = 'win';
        db.prepare('UPDATE users SET gold = gold + ? WHERE id = ?').run(game.bet, req.session.userId);
    } else if (playerValue < dealerValue) {
        game.status = 'lose';
        db.prepare('UPDATE users SET gold = gold - ? WHERE id = ?').run(game.bet, req.session.userId);
    } else {
        game.status = 'push';
    }

    res.redirect('/provinggrounds/games/blackjack');
});

// Jousting
router.get('/joust', (req, res) => {
    const db = req.app.get('db');
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.session.userId);

    const fightLevel = parseInt(db.prepare("SELECT value FROM config WHERE key = 'fight_level_range'").get()?.value || '2');

    const opponents = db.prepare(`
        SELECT u.id, u.name, u.level, u.strength, u.agility,
               jr.wins, jr.losses
        FROM users u
        LEFT JOIN joust_records jr ON u.id = jr.user_id
        WHERE u.id != ?
          AND u.status = 'Alive'
          AND (u.level >= ? - ? OR u.level > ?)
        ORDER BY u.level DESC
        LIMIT 20
    `).all(req.session.userId, user.level, fightLevel, user.level);

    const userJoust = db.prepare('SELECT * FROM joust_records WHERE user_id = ?').get(req.session.userId);

    res.render('pages/games/joust', {
        title: 'The Proving Downs',
        user,
        opponents,
        userJoust,
        joustsRemaining: 2 - user.jousts_today
    });
});

router.post('/joust/:id', (req, res) => {
    const db = req.app.get('db');
    const opponentId = parseInt(req.params.id);

    // Validate opponentId is positive
    if (!opponentId || opponentId <= 0) {
        return res.redirect('/provinggrounds/games/joust');
    }

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.session.userId);

    // Verify opponent exists, is alive, and within level range
    const fightLevel = parseInt(db.prepare("SELECT value FROM config WHERE key = 'fight_level_range'").get()?.value || '2');

    const opponent = db.prepare(`
        SELECT * FROM users
        WHERE id = ?
          AND id != ?
          AND status = 'Alive'
          AND (level >= ? - ? OR level > ?)
    `).get(opponentId, req.session.userId, user.level, fightLevel, user.level);

    if (!opponent || user.jousts_today >= 2) {
        return res.redirect('/provinggrounds/games/joust');
    }

    const userJoust = db.prepare('SELECT * FROM joust_records WHERE user_id = ?').get(req.session.userId);
    const oppJoust = db.prepare('SELECT * FROM joust_records WHERE user_id = ?').get(opponentId);

    // Calculate skill
    const userSkill = user.agility + user.strength + (userJoust?.wins || 0) - (userJoust?.losses || 0);
    const oppSkill = opponent.agility + opponent.strength + (oppJoust?.wins || 0) - (oppJoust?.losses || 0);

    // Joust (best of 5)
    let userWins = 0;
    let oppWins = 0;
    const log = [];

    for (let pass = 1; pass <= 5 && userWins < 3 && oppWins < 3; pass++) {
        const userRoll = Math.random() * userSkill + userSkill / 2;
        const oppRoll = Math.random() * oppSkill + oppSkill / 2;

        if (userRoll > oppRoll) {
            userWins++;
            log.push(`Pass ${pass}: *Thud!* You win this pass!`);
        } else {
            oppWins++;
            log.push(`Pass ${pass}: *Ooof!* You lose this pass!`);
        }
    }

    const won = userWins >= 3;
    // Cap gold reward to prevent integer overflow at high levels (max 100,000 gold)
    const goldReward = won ? Math.min(user.level * user.level * 60, 100000) : 0;

    // Update database
    db.prepare('UPDATE users SET jousts_today = jousts_today + ?, gold = gold + ? WHERE id = ?')
        .run(1, goldReward, req.session.userId);

    if (won) {
        db.prepare('UPDATE joust_records SET wins = wins + 1 WHERE user_id = ?').run(req.session.userId);
        db.prepare('UPDATE joust_records SET losses = losses + 1 WHERE user_id = ?').run(opponentId);
    } else {
        db.prepare('UPDATE joust_records SET losses = losses + 1 WHERE user_id = ?').run(req.session.userId);
        db.prepare('UPDATE joust_records SET wins = wins + 1 WHERE user_id = ?').run(opponentId);
    }

    const updatedUser = db.prepare('SELECT * FROM users WHERE id = ?').get(req.session.userId);

    res.render('pages/games/joust-result', {
        title: 'Joust Result',
        user: updatedUser,
        won,
        opponent,
        log,
        goldReward,
        userWins,
        oppWins
    });
});

// Roulette
router.get('/roulette', (req, res) => {
    const db = req.app.get('db');
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.session.userId);

    res.render('pages/games/roulette', {
        title: 'Roulette',
        user
    });
});

router.post('/roulette/play', (req, res) => {
    const db = req.app.get('db');
    const bet = parseInt(req.body.bet) || 0;
    const betType = req.body.type;
    const betNumber = parseInt(req.body.number) || 0;

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.session.userId);

    if (bet <= 0 || bet > user.gold) {
        return res.render('pages/games/roulette', {
            title: 'Roulette',
            user,
            error: 'Invalid bet amount!'
        });
    }

    // Spin the wheel (0-36)
    const resultNumber = Math.floor(Math.random() * 37);
    const redNumbers = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];
    const resultColor = resultNumber === 0 ? 'green' : (redNumbers.includes(resultNumber) ? 'red' : 'black');

    // Check win
    let won = false;
    let multiplier = 0;

    switch (betType) {
        case 'red':
            won = resultColor === 'red';
            multiplier = 2;
            break;
        case 'black':
            won = resultColor === 'black';
            multiplier = 2;
            break;
        case 'odd':
            won = resultNumber !== 0 && resultNumber % 2 === 1;
            multiplier = 2;
            break;
        case 'even':
            won = resultNumber !== 0 && resultNumber % 2 === 0;
            multiplier = 2;
            break;
        case 'low':
            won = resultNumber >= 1 && resultNumber <= 18;
            multiplier = 2;
            break;
        case 'high':
            won = resultNumber >= 19 && resultNumber <= 36;
            multiplier = 2;
            break;
        case 'number':
            won = resultNumber === betNumber;
            multiplier = 36;
            break;
    }

    const netGain = won ? (bet * multiplier - bet) : -bet;
    db.prepare('UPDATE users SET gold = gold + ? WHERE id = ?').run(netGain, req.session.userId);

    const updatedUser = db.prepare('SELECT * FROM users WHERE id = ?').get(req.session.userId);

    res.render('pages/games/roulette', {
        title: 'Roulette',
        user: updatedUser,
        result: { number: resultNumber, color: resultColor },
        message: won ? `You won ${bet * multiplier} gold!` : `You lost ${bet} gold.`
    });
});

// Russian Roulette
router.get('/russian', (req, res) => {
    const db = req.app.get('db');
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.session.userId);

    res.render('pages/games/russian', {
        title: 'Russian Roulette',
        user
    });
});

router.post('/russian/play', (req, res) => {
    const db = req.app.get('db');
    const chambers = parseInt(req.body.chambers) || 6;
    const bet = parseInt(req.body.bet) || 0;
    const confirm = req.body.confirm;

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.session.userId);

    if (!confirm || bet <= 0 || bet > user.gold || chambers < 2 || chambers > 6) {
        return res.redirect('/provinggrounds/games/russian');
    }

    // Pull the trigger
    const bulletChamber = Math.floor(Math.random() * chambers);
    const survived = bulletChamber !== 0; // 0 = death

    if (survived) {
        const winnings = bet * chambers;
        db.prepare('UPDATE users SET gold = gold + ? WHERE id = ?').run(winnings - bet, req.session.userId);

        const updatedUser = db.prepare('SELECT * FROM users WHERE id = ?').get(req.session.userId);
        res.render('pages/games/russian', {
            title: 'Russian Roulette',
            user: updatedUser,
            result: { survived: true, winnings }
        });
    } else {
        // Player dies
        db.prepare("UPDATE users SET status = 'Dead', hp = 0, gold = 0 WHERE id = ?").run(req.session.userId);

        db.prepare(`
            INSERT INTO death_log (user_id, cause, details)
            VALUES (?, 'Russian Roulette', 'Lost with ${chambers} chambers, bet was ${bet} gold')
        `).run(req.session.userId);

        res.render('pages/games/russian', {
            title: 'Russian Roulette',
            user: { ...user, status: 'Dead', hp: 0 },
            result: { survived: false }
        });
    }
});

module.exports = router;
