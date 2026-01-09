# TPro BBS - CLAUDE.md

This file provides guidance to Claude Code when working with TPro BBS.

## Overview

TPro BBS is a web recreation of an Apple II BBS system, ported from AppleSoft BASIC to Express + EJS + SQLite.

## Commands

```bash
# Database
cd tprobbs && node src/db/init.js    # Initialize/reset database

# The app runs as part of the root server
npm run dev                           # Start dev server (from root)
```

## Architecture

```
/tprobbs/
├── src/
│   ├── routes/         # Express routes
│   │   ├── index.js    # Route aggregator
│   │   ├── auth.js     # Login, register, logout
│   │   ├── main.js     # Main menu, settings, members
│   │   ├── boards.js   # Message boards (Phase 2)
│   │   ├── email.js    # Private messaging (Phase 2)
│   │   ├── combat.js   # Arena, Dungeon (Phase 3)
│   │   ├── games.js    # Casino games (Phase 4)
│   │   ├── gangs.js    # Gang system (Phase 5)
│   │   └── stores.js   # Weapon, armor, spell stores (Phase 4)
│   ├── db/
│   │   ├── schema.sql  # Database schema
│   │   ├── seed.sql    # Equipment, monsters, classes data
│   │   └── init.js     # Database initialization
│   └── middleware/
│       └── auth.js     # Session auth, user loading
├── views/
│   └── pages/          # EJS templates
└── data/
    └── tprobbs.db      # SQLite database
```

## Key Formulas (from BASIC source)

### Combat Damage
```javascript
// Base damage: (4 * weaponLevel + level + stamina/10 - targetArmor) / 2
let damage = (4 * weapon + level + stamina / 10 - targetArmor) / 2;
damage = damage + Math.random() * (Math.abs(damage) + 1);
```

### XP Required for Level
```javascript
// Higher intellect = MORE XP needed
const xpRequired = Math.pow(2, level + 1) * (1100 + intellect * 2);
```

### Monster XP Reward
```javascript
const xp = Math.pow(2, dungeonLevel + 2) * 1000 / 15;
```

### Sell Price
```javascript
const sellPrice = itemPrice * (50 + charisma / 2) / 100;
```

## Database

Uses separate SQLite database from Proving Grounds (`tprobbs/data/tprobbs.db`).

## Testing

### E2E Tests (Playwright)

The E2E test suite is located at `tprobbs/tests/e2e.spec.js`.

**Prerequisites:**
```bash
# Install Playwright (if not already installed)
npx playwright install

# Initialize/reset database before running tests
cd tprobbs && node src/db/init.js
```

**Running Tests:**
```bash
# Run all TPro BBS E2E tests (from project root)
npx playwright test tprobbs/tests/e2e.spec.js

# Run with headed browser (visible)
npx playwright test tprobbs/tests/e2e.spec.js --headed

# Run with Playwright UI for debugging
npx playwright test tprobbs/tests/e2e.spec.js --ui

# Run specific test by name
npx playwright test -g "should spin slot machine"

# Run in specific browser
npx playwright test tprobbs/tests/e2e.spec.js --project=chromium
npx playwright test tprobbs/tests/e2e.spec.js --project=firefox
npx playwright test tprobbs/tests/e2e.spec.js --project=webkit
```

**Test Coverage:**
- Authentication (login, register, invalid credentials)
- Main menu navigation and character stats display
- Stores (weapons, armor, magic shop, healer, bank)
- Combat system (dungeon exploration, navigation)
- Casino games (slots machine)
- Gang headquarters
- System pages (voting booth, info, members list, logout)

**Notes:**
- Tests use a dedicated test user `E2ETestUser`
- Server starts automatically via playwright config (`webServer` option)
- Reset database between test runs for clean state

## Styling

Shares `terminal.css` from Proving Grounds for consistent BBS aesthetic.
