# Architecture

## Project Structure

```
/tprobbs/
├── src/
│   ├── routes/           # Express route handlers
│   │   ├── index.js      # Route aggregator
│   │   ├── auth.js       # Login, register, logout
│   │   ├── main.js       # Main menu, settings, members
│   │   ├── boards.js     # Message boards
│   │   ├── email.js      # Private messaging
│   │   ├── combat.js     # Arena, Dungeon
│   │   ├── games.js      # Casino games
│   │   ├── gangs.js      # Gang system
│   │   └── stores.js     # Weapon, armor, spell stores
│   ├── db/
│   │   ├── schema.sql    # Database schema
│   │   ├── seed.sql      # Equipment, monsters, classes data
│   │   ├── init.js       # Full database reset
│   │   └── ensure.js     # Safe initialization (production)
│   └── middleware/
│       └── auth.js       # Session auth, user loading
├── views/
│   └── pages/            # EJS templates
│       ├── auth/         # Login, register
│       ├── main/         # Main menu, settings
│       ├── boards/       # Message board views
│       ├── email/        # Email views
│       ├── combat/       # Dungeon, arena views
│       ├── games/        # Casino game views
│       ├── stores/       # Shop views
│       └── gangs/        # Gang views
├── data/
│   └── tprobbs.db        # SQLite database
├── tests/
│   └── e2e.spec.js       # Playwright E2E tests
└── docs/                 # This documentation
```

## Route Structure

All routes are prefixed with `/tprobbs`:

| Route | File | Description |
|-------|------|-------------|
| `/` | auth.js | Login page |
| `/register` | auth.js | New user registration |
| `/logout` | auth.js | End session |
| `/main` | main.js | Main menu |
| `/main/settings` | main.js | User settings |
| `/main/members` | main.js | Member list |
| `/main/vote` | main.js | Voting booth |
| `/main/info` | main.js | System info |
| `/boards` | boards.js | Message boards |
| `/email` | email.js | Private messages |
| `/combat` | combat.js | Combat menu |
| `/combat/dungeon` | combat.js | Dungeon exploration |
| `/combat/arena` | combat.js | PvP arena |
| `/stores` | stores.js | Town square |
| `/stores/weapons` | stores.js | Weapon shop |
| `/stores/armor` | stores.js | Armor shop |
| `/stores/magic` | stores.js | Magic shop |
| `/stores/healer` | stores.js | Healer services |
| `/stores/bank` | stores.js | Banking |
| `/games` | games.js | Casino menu |
| `/games/blackjack` | games.js | Blackjack |
| `/games/slots` | games.js | Slot machine |
| `/games/craps` | games.js | Craps |
| `/games/highlow` | games.js | High-Low |
| `/gangs` | gangs.js | Gang headquarters |

## Authentication Flow

1. User submits login form → `POST /tprobbs/login`
2. Route validates credentials against `users` table
3. On success, `userId` stored in session
4. `loadUser` middleware attaches full user object to `req.user`
5. Protected routes check `req.user` exists

## Middleware

### `loadUser(db)`

Loads user data from database on every request:

```javascript
// tprobbs/src/middleware/auth.js
function loadUser(db) {
    return (req, res, next) => {
        if (req.session.tproUserId) {
            req.user = db.prepare('SELECT * FROM users WHERE id = ?')
                .get(req.session.tproUserId);
        }
        next();
    };
}
```

## Template Rendering

Views use the root EJS engine with paths overridden:

```javascript
// server.js sets views path for tprobbs routes
app.use('/tprobbs', (req, res, next) => {
    req.app.set('views', path.join(__dirname, 'tprobbs/views'));
    next();
});
```

## Styling

TPro BBS shares `terminal.css` from Proving Grounds for a consistent BBS aesthetic:

- Green text on black background
- Monospace fonts
- ASCII-art borders
- Retro terminal feel
