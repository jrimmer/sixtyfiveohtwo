/**
 * TPro BBS Casino Games Routes
 */

const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');

// Games menu
router.get('/', requireAuth, (req, res) => {
    res.render('pages/games/menu', {
        title: 'Casino Games',
        user: req.user
    });
});

// Blackjack
router.get('/blackjack', requireAuth, (req, res) => {
    // Initialize game if needed
    if (!req.session.blackjack) {
        req.session.blackjack = {
            bet: 0,
            playerHand: [],
            dealerHand: [],
            deck: [],
            gameState: 'betting' // betting, playing, dealerTurn, done
        };
    }

    res.render('pages/games/blackjack', {
        title: 'Blackjack',
        user: req.user,
        game: req.session.blackjack,
        message: null
    });
});

// Shuffle deck helper
function shuffleDeck() {
    const suits = ['♠', '♥', '♦', '♣'];
    const values = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
    const deck = [];

    for (const suit of suits) {
        for (const value of values) {
            deck.push({ suit, value });
        }
    }

    // Fisher-Yates shuffle
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }

    return deck;
}

// Calculate hand value
function handValue(hand) {
    let value = 0;
    let aces = 0;

    for (const card of hand) {
        if (card.value === 'A') {
            aces++;
            value += 11;
        } else if (['K', 'Q', 'J'].includes(card.value)) {
            value += 10;
        } else {
            value += parseInt(card.value, 10);
        }
    }

    while (value > 21 && aces > 0) {
        value -= 10;
        aces--;
    }

    return value;
}

// Place bet
router.post('/blackjack/bet', requireAuth, (req, res) => {
    const db = req.app.get('tprodb');
    const bet = parseInt(req.body.bet, 10) || 0;

    if (bet <= 0 || bet > req.user.gold) {
        return res.render('pages/games/blackjack', {
            title: 'Blackjack',
            user: req.user,
            game: req.session.blackjack || { gameState: 'betting' },
            message: 'Invalid bet amount'
        });
    }

    // Deduct bet
    db.prepare('UPDATE users SET gold = gold - ? WHERE id = ?').run(bet, req.user.id);

    // Initialize game
    const deck = shuffleDeck();
    const playerHand = [deck.pop(), deck.pop()];
    const dealerHand = [deck.pop(), deck.pop()];

    req.session.blackjack = {
        bet,
        playerHand,
        dealerHand,
        deck,
        gameState: 'playing'
    };

    // Check for blackjack
    if (handValue(playerHand) === 21) {
        req.session.blackjack.gameState = 'done';
        const winnings = Math.floor(bet * 2.5);
        db.prepare('UPDATE users SET gold = gold + ? WHERE id = ?').run(winnings, req.user.id);

        return res.render('pages/games/blackjack', {
            title: 'Blackjack',
            user: { ...req.user, gold: req.user.gold - bet + winnings },
            game: req.session.blackjack,
            message: `Blackjack! You win ${winnings} gold!`
        });
    }

    res.redirect('/tprobbs/games/blackjack');
});

// Hit
router.post('/blackjack/hit', requireAuth, (req, res) => {
    const db = req.app.get('tprodb');
    const game = req.session.blackjack;

    if (!game || game.gameState !== 'playing') {
        return res.redirect('/tprobbs/games/blackjack');
    }

    game.playerHand.push(game.deck.pop());
    const value = handValue(game.playerHand);

    if (value > 21) {
        game.gameState = 'done';
        req.session.blackjack = game;
        return res.render('pages/games/blackjack', {
            title: 'Blackjack',
            user: req.user,
            game,
            message: `Bust! You lose ${game.bet} gold.`
        });
    }

    if (value === 21) {
        // Auto-stand on 21
        return handleStand(req, res, db);
    }

    req.session.blackjack = game;
    res.redirect('/tprobbs/games/blackjack');
});

// Stand
function handleStand(req, res, db) {
    const game = req.session.blackjack;
    game.gameState = 'dealerTurn';

    // Dealer draws to 17
    while (handValue(game.dealerHand) < 17) {
        game.dealerHand.push(game.deck.pop());
    }

    const playerValue = handValue(game.playerHand);
    const dealerValue = handValue(game.dealerHand);

    game.gameState = 'done';
    let message;
    let winnings = 0;

    if (dealerValue > 21) {
        winnings = game.bet * 2;
        message = `Dealer busts! You win ${winnings} gold!`;
    } else if (playerValue > dealerValue) {
        winnings = game.bet * 2;
        message = `You win ${winnings} gold!`;
    } else if (playerValue < dealerValue) {
        message = `Dealer wins. You lose ${game.bet} gold.`;
    } else {
        winnings = game.bet;
        message = 'Push! Bet returned.';
    }

    if (winnings > 0) {
        db.prepare('UPDATE users SET gold = gold + ? WHERE id = ?').run(winnings, req.user.id);
    }

    req.session.blackjack = game;
    res.render('pages/games/blackjack', {
        title: 'Blackjack',
        user: { ...req.user, gold: req.user.gold - game.bet + winnings },
        game,
        message
    });
}

router.post('/blackjack/stand', requireAuth, (req, res) => {
    const db = req.app.get('tprodb');
    const game = req.session.blackjack;

    if (!game || game.gameState !== 'playing') {
        return res.redirect('/tprobbs/games/blackjack');
    }

    handleStand(req, res, db);
});

// New game
router.post('/blackjack/new', requireAuth, (req, res) => {
    req.session.blackjack = {
        bet: 0,
        playerHand: [],
        dealerHand: [],
        deck: [],
        gameState: 'betting'
    };
    res.redirect('/tprobbs/games/blackjack');
});

// Slots
router.get('/slots', requireAuth, (req, res) => {
    res.render('pages/games/slots', {
        title: 'Slot Machine',
        user: req.user,
        result: null,
        message: null,
        lastBet: 10
    });
});

router.post('/slots/spin', requireAuth, (req, res) => {
    const db = req.app.get('tprodb');
    const bet = parseInt(req.body.bet, 10) || 0;

    if (bet <= 0 || bet > req.user.gold) {
        return res.render('pages/games/slots', {
            title: 'Slot Machine',
            user: req.user,
            result: null,
            message: 'Invalid bet amount',
            lastBet: bet || 10
        });
    }

    // Deduct bet
    db.prepare('UPDATE users SET gold = gold - ? WHERE id = ?').run(bet, req.user.id);

    // Spin reels
    const symbols = ['🍒', '🍋', '🍊', '🍇', '⭐', '7️⃣', '💎'];
    const weights = [30, 25, 20, 15, 7, 2, 1]; // Lower = rarer
    const totalWeight = weights.reduce((a, b) => a + b, 0);

    function pickSymbol() {
        let r = Math.random() * totalWeight;
        for (let i = 0; i < symbols.length; i++) {
            r -= weights[i];
            if (r <= 0) return symbols[i];
        }
        return symbols[0];
    }

    const reels = [pickSymbol(), pickSymbol(), pickSymbol()];

    // Calculate winnings
    let multiplier = 0;
    if (reels[0] === reels[1] && reels[1] === reels[2]) {
        // Three of a kind
        const symbolIndex = symbols.indexOf(reels[0]);
        multiplier = [3, 5, 10, 20, 50, 100, 500][symbolIndex];
    } else if (reels[0] === reels[1] || reels[1] === reels[2] || reels[0] === reels[2]) {
        // Two of a kind
        multiplier = 2;
    }

    const winnings = bet * multiplier;
    let message;

    if (winnings > 0) {
        db.prepare('UPDATE users SET gold = gold + ? WHERE id = ?').run(winnings, req.user.id);
        message = `You win ${winnings} gold!`;
    } else {
        message = 'No win. Try again!';
    }

    res.render('pages/games/slots', {
        title: 'Slot Machine',
        user: { ...req.user, gold: req.user.gold - bet + winnings },
        result: { reels, winnings, message },
        message,
        lastBet: bet
    });
});

// Craps
router.get('/craps', requireAuth, (req, res) => {
    res.render('pages/games/craps', {
        title: 'Craps',
        user: req.user,
        game: req.session.craps || { point: null },
        result: null,
        message: null
    });
});

router.post('/craps/roll', requireAuth, (req, res) => {
    const db = req.app.get('tprodb');
    const bet = parseInt(req.body.bet, 10) || 0;

    if (bet <= 0 || bet > req.user.gold) {
        return res.render('pages/games/craps', {
            title: 'Craps',
            user: req.user,
            game: req.session.craps || { point: null },
            result: null,
            message: 'Invalid bet amount'
        });
    }

    // Deduct bet
    db.prepare('UPDATE users SET gold = gold - ? WHERE id = ?').run(bet, req.user.id);

    // Roll dice
    const die1 = Math.floor(Math.random() * 6) + 1;
    const die2 = Math.floor(Math.random() * 6) + 1;
    const total = die1 + die2;

    let message;
    let winnings = 0;
    let game = req.session.craps || { point: null };

    if (game.point === null) {
        // Come out roll
        if (total === 7 || total === 11) {
            winnings = bet * 2;
            message = `Natural ${total}! You win ${winnings} gold!`;
        } else if (total === 2 || total === 3 || total === 12) {
            message = `Craps! You lose ${bet} gold.`;
        } else {
            game.point = total;
            // Return bet for point phase
            db.prepare('UPDATE users SET gold = gold + ? WHERE id = ?').run(bet, req.user.id);
            message = `Point is ${total}. Roll again to hit your point!`;
        }
    } else {
        // Point roll
        if (total === game.point) {
            winnings = bet * 2;
            message = `You hit your point! You win ${winnings} gold!`;
            game.point = null;
        } else if (total === 7) {
            message = `Seven out! You lose ${bet} gold.`;
            game.point = null;
        } else {
            // Continue rolling
            db.prepare('UPDATE users SET gold = gold + ? WHERE id = ?').run(bet, req.user.id);
            message = `Rolled ${total}. Keep rolling for ${game.point}!`;
        }
    }

    if (winnings > 0) {
        db.prepare('UPDATE users SET gold = gold + ? WHERE id = ?').run(winnings, req.user.id);
    }

    req.session.craps = game;

    res.render('pages/games/craps', {
        title: 'Craps',
        user: { ...req.user, gold: req.user.gold - bet + winnings },
        game,
        result: { die1, die2, total },
        message
    });
});

// High-Low
router.get('/highlow', requireAuth, (req, res) => {
    // Initialize if needed
    if (!req.session.highlow || req.session.highlow.gameOver) {
        req.session.highlow = {
            currentCard: Math.floor(Math.random() * 13) + 1,
            streak: 0,
            bet: 0,
            gameOver: false
        };
    }

    res.render('pages/games/highlow', {
        title: 'High-Low',
        user: req.user,
        game: req.session.highlow,
        message: null
    });
});

router.post('/highlow/bet', requireAuth, (req, res) => {
    const db = req.app.get('tprodb');
    const bet = parseInt(req.body.bet, 10) || 0;

    if (bet <= 0 || bet > req.user.gold) {
        return res.render('pages/games/highlow', {
            title: 'High-Low',
            user: req.user,
            game: req.session.highlow || { currentCard: 7, streak: 0, bet: 0, gameOver: false },
            message: 'Invalid bet amount'
        });
    }

    db.prepare('UPDATE users SET gold = gold - ? WHERE id = ?').run(bet, req.user.id);

    req.session.highlow = {
        currentCard: Math.floor(Math.random() * 13) + 1,
        streak: 0,
        bet,
        gameOver: false
    };

    res.redirect('/tprobbs/games/highlow');
});

router.post('/highlow/guess', requireAuth, (req, res) => {
    const db = req.app.get('tprodb');
    const { guess } = req.body;
    const game = req.session.highlow;

    if (!game || game.gameOver || game.bet === 0) {
        return res.redirect('/tprobbs/games/highlow');
    }

    const newCard = Math.floor(Math.random() * 13) + 1;
    const isHigher = newCard > game.currentCard;
    const isLower = newCard < game.currentCard;
    const correct = (guess === 'high' && isHigher) || (guess === 'low' && isLower);

    if (newCard === game.currentCard) {
        // Tie - continue
        game.currentCard = newCard;
        req.session.highlow = game;
        return res.render('pages/games/highlow', {
            title: 'High-Low',
            user: req.user,
            game,
            message: `Tie! Card was ${newCard}. Guess again.`
        });
    }

    if (correct) {
        game.streak++;
        game.currentCard = newCard;
        req.session.highlow = game;

        res.render('pages/games/highlow', {
            title: 'High-Low',
            user: req.user,
            game,
            message: `Correct! Card was ${newCard}. Streak: ${game.streak}`
        });
    } else {
        game.gameOver = true;
        req.session.highlow = game;

        res.render('pages/games/highlow', {
            title: 'High-Low',
            user: { ...req.user, gold: req.user.gold - game.bet },
            game,
            message: `Wrong! Card was ${newCard}. You lose ${game.bet} gold.`
        });
    }
});

router.post('/highlow/cashout', requireAuth, (req, res) => {
    const db = req.app.get('tprodb');
    const game = req.session.highlow;

    if (!game || game.gameOver || game.bet === 0 || game.streak === 0) {
        return res.redirect('/tprobbs/games/highlow');
    }

    // Calculate winnings (doubles each streak)
    const winnings = game.bet * Math.pow(2, game.streak);
    db.prepare('UPDATE users SET gold = gold + ? WHERE id = ?').run(winnings, req.user.id);

    game.gameOver = true;
    req.session.highlow = game;

    res.render('pages/games/highlow', {
        title: 'High-Low',
        user: { ...req.user, gold: req.user.gold - game.bet + winnings },
        game,
        message: `Cashed out! You win ${winnings} gold! (${game.streak} streak)`
    });
});

module.exports = router;
