# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Telengard Web - A faithful web port of the classic 1982 Avalon Hill dungeon crawler game Telengard. The game engine was reverse-engineered from the original Apple II disk image (`Telengard_v1.12_1982_Avalon_Hill.do`).

## Commands

```bash
# Development
cd telengard && npm run dev      # Start dev server (http://localhost:5173)
cd telengard && npm run build    # Production build
cd telengard && npm run preview  # Preview production build

# Disk image analysis (one-time, already done)
python3 extract_disk.py          # Extract files from Apple II disk image
```

## Architecture

### Directory Structure
```
telengard/
├── src/
│   ├── engine/           # Core game logic (ported from Applesoft BASIC)
│   │   ├── types.ts      # Type definitions and const enums
│   │   ├── dungeon.ts    # Procedural dungeon generation (hash algorithm)
│   │   ├── monsters.ts   # 20 monster types and combat AI
│   │   ├── spells.ts     # 36 spells across 6 levels
│   │   ├── character.ts  # Stats, inventory, leveling
│   │   └── locations.ts  # 10 special locations (Inn, Altar, Throne, etc.)
│   ├── state/
│   │   └── gameState.ts  # Zustand store for all game state
│   ├── saves/
│   │   └── storage.ts    # localStorage and cloud save system
│   ├── renderers/
│   │   ├── AsciiRenderer.tsx   # Classic green-on-black terminal style
│   │   └── ModernRenderer.tsx  # Polished modern UI
│   └── App.tsx           # Main app with keyboard controls
diskimage/
├── extracted/            # Extracted files from disk image
│   ├── DISK_TELENGARD.bas  # Main game source (detokenized)
│   └── *.PLR.bin         # Sample save files
└── Telengard_*.do        # Original Apple II disk image
```

### Key Algorithms

**Dungeon Generation** (`dungeon.ts`):
- Procedural hash using constants: XO=1.6915, YO=1.4278, ZO=1.2462, W0=4694
- Formula: `Q = X*XO + Y*YO + Z*ZO + (X+XO)*(Y+YO)*(Z+ZO)`
- Fractional part determines walls and special locations
- 200x200x50 grid (X, Y, dungeon level)

**Combat** (`monsters.ts`, `character.ts`):
- Hit calculation: `roll = INT(RND*20) + level + weapon + STR/2`
- Damage: `INT(RND*8 + RND*level*2 + weapon + 1)`
- 20 monster types with undead flag for Turn Undead spell

**Spell System** (`spells.ts`):
- 36 spells (6 per level, 6 levels total)
- Max spell level: `MIN(INT(charLevel/3)+1, 6)`
- Spell cost equals spell level in spell units

### State Management

Uses Zustand with a seeded PRNG for deterministic gameplay. Key state:
- `character`: Player stats, inventory, position
- `currentMonster`: Active combat encounter
- `phase`: GamePhase (Title, Exploration, Combat, Inn, Dead)
- `renderMode`: Toggle between ASCII and Modern renderers

### Controls

**Exploration**: WASD/Arrows (move), </, (stairs up), >/. (stairs down), C (cast)
**Combat**: F (fight), C (cast), E (evade)
**System**: Tab (toggle renderer), Ctrl+R (scroll of rescue), Ctrl+H (healing potion)

## Tech Stack

- React 19 + TypeScript
- Vite 7 for bundling
- Zustand for state management
- Tailwind CSS 4 for styling
