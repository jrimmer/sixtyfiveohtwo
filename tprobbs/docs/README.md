# TPro BBS Documentation

Welcome to TPro BBS - a web recreation of an Apple II BBS system, faithfully ported from AppleSoft BASIC to modern web technologies.

## Quick Links

| Document | Description |
|----------|-------------|
| [Getting Started](getting-started.md) | Setup, installation, and running the app |
| [Architecture](architecture.md) | Project structure and technical overview |
| [Game Mechanics](game-mechanics.md) | Combat formulas, XP system, and gameplay |
| [Database](database.md) | Schema, initialization scripts, and data management |
| [Deployment](deployment.md) | Coolify, Docker, and production deployment |
| [Testing](testing.md) | E2E tests with Playwright |

## Overview

TPro BBS recreates the classic BBS experience with:

- **Character System** - Create characters with classes, stats, and equipment
- **Combat** - Dungeon exploration with monsters, XP, and leveling
- **Town Square** - Weapon shop, armor shop, magic shop, healer, and bank
- **Casino** - Blackjack, slots, craps, and high-low games
- **Gangs** - Form and manage player gangs
- **Message Boards** - Classic BBS communication
- **Private Email** - Player-to-player messaging
- **Voting Booth** - Vote for your favorite players
- **Terminal Emulation** - Screen themes (green/amber/white phosphor), baud rate simulation, keyboard shortcuts

## Tech Stack

- **Backend**: Express.js 5
- **Templates**: EJS
- **Database**: SQLite (better-sqlite3)
- **Styling**: Shared terminal.css for authentic BBS aesthetic
- **Testing**: Playwright E2E

## Original Source

This port is based on the original AppleSoft BASIC source code, with formulas and game mechanics faithfully recreated for the web.
