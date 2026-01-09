# Getting Started

## Prerequisites

- Node.js 18+
- npm

## Installation

TPro BBS runs as part of the root SixtyFiveOhTwo server.

```bash
# From project root
npm install

# Initialize the TPro BBS database (fresh install)
cd tprobbs && node src/db/init.js
```

## Running the App

```bash
# From project root
npm run dev    # Development with hot reload
npm start      # Production mode
```

Access TPro BBS at: `http://localhost:3000/tprobbs`

## Commands Reference

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server with hot reload (from root) |
| `npm start` | Start production server (from root) |
| `node src/db/init.js` | Reset database (deletes all data) |
| `node src/db/ensure.js` | Safe init - creates/seeds only if needed |

## First Time Setup

1. Start the server: `npm run dev`
2. Navigate to `http://localhost:3000/tprobbs`
3. Click "New User Registration"
4. Create your character (choose username, password, class)
5. Login and explore!

## Game Features

Once logged in, you can:

- **Message Boards** - Read and post messages
- **Private Email** - Send messages to other players
- **Combat Menu** - Enter the dungeon or arena
- **Town Square** - Buy weapons, armor, spells, heal, bank
- **Casino** - Gamble your gold
- **Gang HQ** - Create or join gangs
- **Settings** - Customize your experience

## Next Steps

- [Architecture](architecture.md) - Understand the codebase
- [Game Mechanics](game-mechanics.md) - Learn the formulas
- [Testing](testing.md) - Run the test suite
