# SixtyFiveOhTwo

A collection of classic Apple II games faithfully recreated for the modern web. Each game was reverse-engineered from original disk images and rebuilt using contemporary web technologies while preserving the authentic gameplay experience.

## Games

### Telengard

A web port of the classic 1982 Avalon Hill dungeon crawler. Explore a procedurally generated 200x200x50 dungeon, battle 20 different monster types, and master 36 spells across 6 levels.

**Features:**
- Faithful recreation of the original Applesoft BASIC game engine
- Procedural dungeon generation using the original hash algorithm
- Two rendering modes: ASCII (classic green terminal) and Modern UI
- Local save system with cloud save support
- All 10 special locations: Inn, Altar, Throne, Fountain, Cube, Teleporter, Pit, Elevator, Stairs, and Misty areas

**Controls:**
- Movement: WASD or Arrow keys
- Stairs: `<` / `,` (up) and `>` / `.` (down)
- Cast spell: `C`
- Combat: `F` (fight), `C` (cast), `E` (evade)
- Toggle renderer: `Tab`

**Tech Stack:** React 19, TypeScript, Vite 7, Zustand, Tailwind CSS 4

---

### Sabotage

A pixel-perfect recreation of the classic Apple II arcade game. Defend your base from waves of helicopters dropping paratroopers and bombers dropping explosives.

**Features:**
- Three visual modes: Retro (scanlines), Clean, and Modern
- Authentic physics ported from 6502 assembly
- Web Audio API sound effects
- Original game timing and difficulty curve

**Controls:**
- Rotate gun: `D` (left), `F` (right)
- Fire: Any other key
- Visual mode: `1` (Retro), `2` (Clean), `3` (Modern)

**Tech Stack:** React 19, TypeScript, Vite 7, Canvas API

---

### The Proving Grounds

A web recreation of the legendary Apple II BBS door game. Create a character, battle monsters, challenge other players, and climb the combat ladder.

**Features:**
- Full BBS experience with authentic terminal styling
- Character creation with classes and stats
- Combat system with weapons, armor, and spells
- Message boards and community features
- Gambling games: Blackjack, Slots, Roulette, Russian Roulette
- Player vs Player jousting
- Castle exploration and dungeon crawling

**Tech Stack:** Express 5, EJS, SQLite (better-sqlite3), Socket.IO

---

## Quick Start

### Prerequisites

- Node.js 18 or higher
- npm

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/sixtyfiveohtwo.git
cd sixtyfiveohtwo

# Install dependencies (also builds sub-apps)
npm install

# Initialize Proving Grounds database
cd provinggrounds && npm run db:init && cd ..

# Start the server
npm start
```

The server runs at `http://localhost:3000` by default.

### Development

```bash
# Start with hot reload
npm run dev

# Build all games manually
npm run build

# Build individual games
npm run build:telengard
npm run build:sabotage
```

### Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
PORT=3000                                    # Server port
NODE_ENV=development                         # Environment (development/production)
SESSION_SECRET=your-secret-key-here          # Required in production
DATABASE_PATH=./provinggrounds/data/provinggrounds.db
```

## Project Structure

```
sixtyfiveohtwo/
├── server.js              # Main Express server
├── package.json           # Root package with build scripts
├── views/
│   └── index.ejs          # Apple II style landing page
├── telengard/             # Telengard game
│   ├── src/
│   │   ├── engine/        # Game logic (dungeon, combat, spells)
│   │   ├── state/         # Zustand store
│   │   ├── renderers/     # ASCII and Modern UI
│   │   └── saves/         # Save system
│   └── diskimage/         # Original Apple II disk image
├── sabotage/
│   ├── sabotage-web/      # Web port
│   │   ├── src/
│   │   │   ├── engine/    # Game state, update loop, renderer
│   │   │   ├── constants/ # Values from 6502 disassembly
│   │   │   └── audio/     # Sound effects
│   └── Sabotage.dis65     # SourceGen disassembly project
└── provinggrounds/
    ├── src/
    │   ├── routes/        # Express route handlers
    │   └── db/            # SQLite schema and seeds
    ├── views/             # EJS templates
    └── original-disks/    # Original Apple II disk images
```

## Deployment

### Railway

1. Push to GitHub/GitLab
2. Create new Railway project from the repository
3. Set environment variables:
   - `SESSION_SECRET` (required)
   - `NODE_ENV=production`
4. Railway auto-detects Node.js and deploys

### Manual Deployment

```bash
# Build for production
NODE_ENV=production npm install

# Start server
NODE_ENV=production node server.js
```

The health check endpoint is available at `/health`.

## Routes

| Route | Description |
|-------|-------------|
| `/` | Game selection menu |
| `/telengard/` | Telengard dungeon crawler |
| `/sabotage/` | Sabotage arcade game |
| `/provinggrounds/` | Proving Grounds BBS |
| `/health` | Health check endpoint |

## Historical Context

### The 6502 Processor

The MOS Technology 6502 was an 8-bit microprocessor that powered the Apple II, Commodore 64, Atari 2600, and NES. Its low cost and elegant design made home computing accessible in the late 1970s and early 1980s.

### The Games

- **Telengard** (1982) - Created by Daniel Lawrence, inspired by the mainframe game DND. One of the first commercial dungeon crawlers.
- **Sabotage** (1981) - A fast-paced arcade shooter that showcased the Apple II's hi-res graphics capabilities.
- **The Proving Grounds** - A classic BBS door game where players created characters and battled for supremacy on the combat ladder.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines on how to contribute to this project.

## License

This project is for educational and preservation purposes. The original games are property of their respective copyright holders.

## Acknowledgments

- Original game authors and publishers
- The Apple II preservation community
- [6502bench SourceGen](https://6502bench.com/) for disassembly tools
- The retrocomputing community for keeping these classics alive
