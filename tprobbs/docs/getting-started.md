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
- **Voting Booth** - Vote for your favorite player
- **Settings** - Customize your experience

## Terminal Features

The BBS includes authentic terminal emulation features accessible via the selector in the bottom-right corner:

### Screen Themes
- **Native** - Default green on black
- **Green Phosphor** - Classic green CRT look
- **Amber Phosphor** - Warm amber monochrome
- **White Phosphor** - White on black monochrome

### Baud Rate Simulation
Experience authentic dial-up speeds:
- 300 baud (30 CPS) - Original acoustic coupler speed
- 1200 baud - Early modem speed
- 2400 baud - Standard 1980s modem
- 9600 baud - Fast for the era
- 14.4k / 28.8k baud - 1990s speeds
- Unlimited - Instant display

Press any key or click to skip baud simulation on any page.

### Keyboard Shortcuts
- Press the letter shown in parentheses (e.g., `B` for "B) Back") to select menu items
- `<` or `,` - Return to previous menu

## Next Steps

- [Architecture](architecture.md) - Understand the codebase
- [Game Mechanics](game-mechanics.md) - Learn the formulas
- [Testing](testing.md) - Run the test suite
