# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This project contains a reverse-engineered **Sabotage** Apple II game and a modern web port.

### Original Game Files
- `Sabotage` - The original 14KB binary (loads at $1D00, entry point at $1D00)
- `Sabotage.dis65` - SourceGen disassembly project file (JSON format)

### Web Port (`sabotage-web/`)
A React + TypeScript + Canvas recreation of the original game with three visual modes.

## Architecture

### Memory Layout
- **$1D00-$1FFF**: Loader/unpacker code (erases itself after setup)
- **$4000+**: Main game code (unpacked to $4000 area during initialization)
- Uses Apple II hi-res page 1 ($2000-$3FFF)
- Text screen at $0400, screen holes used for copy protection checks

### Key Entry Points
- `Start` ($1D00): Initial loader entry
- `ColdInit` ($4000): Main game initialization after unpacking
- `SelfDestruct` ($4266): Copy protection trigger

### Game Structure
The game has two alternating modes:
1. **Helicopter mode**: Helicopters drop paratroopers
2. **Bomber mode**: Bombers drop bombs

Key game objects tracked in memory:
- Gun turret: Position at $45E2-$45E3, angle range [4,52]
- Fliers: 4 active slots, 10 bytes per struct
- Paratroopers: 8 active slots, 5 bytes per struct
- Shell: Single active shell with 8.8 fixed-point position
- Shrapnel particles for explosions

### Copy Protection
Uses screen hole validation - checks values at $0478 and related locations periodically. Failure triggers `SelfDestruct` which corrupts memory via interrupt vectors.

## Tools

This project uses **6502bench SourceGen** for disassembly. The .dis65 file is the project file containing:
- User-defined labels and comments
- Data type annotations
- Platform symbol references (Apple II ROM, DOS 3.3)

To work with this project, open `Sabotage.dis65` in SourceGen. Export assembly source using SourceGen's export feature.

## Platform References

The disassembly references these Apple II symbol files:
- `F8-ROM.sym65` - Monitor ROM routines
- `Cxxx-IO.sym65` - I/O soft switches
- `C08x-DiskII.sym65` - Disk II controller
- `DOS33.sym65` - DOS 3.3 entry points

## Web Port Commands

```bash
cd sabotage-web
npm install      # Install dependencies
npm run dev      # Start development server
npm run build    # Production build
```

## Web Port Architecture

### Directory Structure
- `src/engine/` - Core game logic (state, update, renderer)
- `src/components/` - React components
- `src/hooks/` - Custom hooks (keyboard, game loop)
- `src/constants/` - Game constants ported from 6502 disassembly
- `src/types/` - TypeScript type definitions
- `src/audio/` - Web Audio API sound effects

### Key Files
- `src/engine/update.ts` - Main game loop logic, ported from 6502
- `src/engine/renderer.ts` - Canvas rendering with 3 visual modes
- `src/engine/state.ts` - Game state management
- `src/constants/game.ts` - All constants derived from disassembly

### Controls
- **D** - Rotate gun left
- **F** - Rotate gun right
- **Any other key** - Fire
- **1/2/3** - Switch visual mode (Retro/Clean/Modern)

### Visual Modes
1. **Retro** (default) - Pixel-perfect 280x192, scanlines
2. **Clean** - Same shapes, crisp scaling
3. **Modern** - Smooth rendering
