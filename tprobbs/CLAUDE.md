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

## Styling

Shares `terminal.css` from Proving Grounds for consistent BBS aesthetic.
