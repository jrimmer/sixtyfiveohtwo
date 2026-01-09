# TPro BBS Port Design

## Overview

Port TPro BBS from Apple II AppleSoft BASIC to a modern web application using the same architecture as Proving Grounds (Express + EJS + SQLite).

## Source Analysis

### Archive Format

- **12 ShrinkIt archives (.shk)** - NuFile format, Apple II compression
- Total ~7.9MB compressed
- Extractable with nulib2

| Archive | Size | Contents |
|---------|------|----------|
| tpro1.shk | 67KB | Core config, system files |
| tpro2.shk | 633KB | Message boards data (479 records) |
| tpro3.shk | 31KB | Help files |
| tpro4.shk | 1.8MB | Downloadable files (Eamon, games) |
| tpro5.shk | 232KB | Apple general files |
| tpro6.shk | 2.7MB | Apple utilities |
| tpro7.shk | 744KB | IBM files |
| tpro8.shk | 973KB | Mac files |
| tpro9.shk | 200KB | Pictures/GIFs |
| tpro10.shk | 100KB | MT Simulator module |
| tpro11.shk | 381KB | Main program files (BASIC) |
| tpro12.shk | 1KB | TOP.ANALYZE utility |

### Code Format

- **AppleSoft BASIC** - Tokenized, runs on Apple II/IIe/IIgs
- ~12 main program modules, ~17KB average size each
- Text data files for menus, config, user data
- Custom `&` commands for modem/terminal control (not standard BASIC)

### System Architecture

| Component | Files | Description |
|-----------|-------|-------------|
| Core | MAIN, LOGON, EMAIL | Login, main menu, messaging |
| Boards | BOARDS, BOARDS.CNG, BOARDS.EDIT, BOARDS.OBJ | Message boards system |
| Games | CASINO, DUNGEON, ARENA, GAME, ARCADE | Door games |
| Users | FILES, GANGS, BBS.DB | File sections, gangs/parties |
| Data | tpro2-9.shk | User posts, downloads, pics |

### Features Compared to Proving Grounds

| Feature | TPro BBS | Proving Grounds | Similarity |
|---------|----------|-----------------|------------|
| User auth | Yes | Yes | High |
| Message boards | Yes | Yes | High |
| Casino games | Blackjack, Craps, In-Between, Slots | Blackjack, Slots, Roulette, Russian | High |
| Combat/Dungeon | Arena, Dungeon (7x7 grid) | Castle, Dungeon, Proving Grounds | High |
| Character classes | 11 classes (Fighter, Magician, etc.) | Yes | High |
| Weapons/Armor | 54 weapons, 27 armors | Similar | High |
| Spells | 12 spells | Similar | High |
| Gangs/Parties | Yes (full gang system) | Yes (but simpler) | Medium |
| Private Email | Yes | No | Low |
| File transfers | Yes | No | N/A (won't port) |

## Porting Feasibility Assessment

### Code Complexity Comparison

| Metric | TPro BBS | Proving Grounds | Assessment |
|--------|----------|-----------------|------------|
| Main modules | 12 BASIC files | 6 route files | TPro larger |
| Total code | ~150KB tokenized | ~66KB JS | Similar logic |
| Data format | Text files, random-access | SQLite | PG more robust |
| State mgmt | POKE/PEEK, variables | Express sessions | Different approach |

### Key Porting Challenges

1. **AppleSoft BASIC quirks** - TPro uses custom `&` commands (e.g., `&*80`, `&INPUTIN$`, `&LET1`). These are modem/terminal control extensions, not standard BASIC. Must be interpreted and mapped to web equivalents.

2. **Random-access files** - TPro uses `READ/WRITE...R<record>` for user data. This maps cleanly to SQLite rows.

3. **Session state** - TPro stores state in BASIC variables across CHAINed programs. Express sessions handle this naturally.

4. **Terminal control** - Heavy use of `CHR$(4)` (DOS commands), cursor positioning, inverse text. EJS templates replace this.

### Portability Rating: HIGH

The architecture is very similar to Proving Grounds. Same fundamental pattern:
- Menu-driven navigation
- User records with stats
- Combat formulas
- Gambling games
- Message boards

## Architecture

### Directory Structure

```
/tprobbs/                    # New top-level directory (like /provinggrounds)
├── src/
│   ├── routes/
│   │   ├── index.js         # Route aggregator
│   │   ├── auth.js          # Login, registration, logout
│   │   ├── main.js          # Main menu, user settings, members list
│   │   ├── boards.js        # Message boards (forums)
│   │   ├── email.js         # Private messaging
│   │   ├── combat.js        # Arena, Dungeon
│   │   ├── games.js         # Casino (Blackjack, Craps, In-Between, Slots)
│   │   ├── gangs.js         # Gang/party system
│   │   └── stores.js        # Weapons, armor, spells, homes, security
│   ├── db/
│   │   ├── index.js         # Database connection
│   │   ├── schema.sql       # SQLite schema
│   │   └── seed.sql         # Initial data (weapons, armor, spells, classes)
│   └── middleware/
│       └── auth.js          # Session authentication
├── views/
│   ├── layouts/
│   │   └── main.ejs         # Base layout with BBS styling
│   └── pages/               # One EJS per screen (mirrors BASIC menus)
│       ├── login.ejs
│       ├── register.ejs
│       ├── main.ejs
│       ├── settings.ejs
│       ├── members.ejs
│       ├── boards/
│       ├── email/
│       ├── combat/
│       ├── games/
│       ├── gangs/
│       └── stores/
├── data/
│   └── tprobbs.db           # SQLite database (separate from provinggrounds)
├── package.json
└── CLAUDE.md                # Game-specific guidance
```

### Database Schema

Separate database from Proving Grounds (`/tprobbs/data/tprobbs.db`).

```sql
-- Users table (maps to TPro's USERS random-access file)
CREATE TABLE users (
    id INTEGER PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    answer TEXT,                    -- Security question answer
    phone TEXT,
    computer_type INTEGER DEFAULT 0,
    screen_width INTEGER DEFAULT 80,
    nulls INTEGER DEFAULT 0,
    access_level INTEGER DEFAULT 5,
    bit_flags INTEGER DEFAULT 0,    -- Linefeeds, brief mode, etc.
    time_limit INTEGER DEFAULT 60,
    last_on TEXT,
    calls INTEGER DEFAULT 0,
    uploads INTEGER DEFAULT 0,
    downloads INTEGER DEFAULT 0,
    -- Character stats
    class INTEGER DEFAULT 0,
    level INTEGER DEFAULT 1,
    experience REAL DEFAULT 0,
    status INTEGER DEFAULT 1,       -- 0=dead, 1=alive
    -- Attributes
    stamina INTEGER DEFAULT 10,
    intellect INTEGER DEFAULT 10,
    agility INTEGER DEFAULT 10,
    charisma INTEGER DEFAULT 10,
    -- Combat stats
    hit_points INTEGER DEFAULT 20,
    max_hp INTEGER DEFAULT 20,
    spell_power INTEGER DEFAULT 10,
    max_sp INTEGER DEFAULT 10,
    -- Equipment (store indices)
    weapon INTEGER DEFAULT 0,
    armor INTEGER DEFAULT 0,
    spells INTEGER DEFAULT 0,       -- Bitmask of owned spells
    home INTEGER DEFAULT 0,
    security INTEGER DEFAULT 0,
    -- Economy
    gold REAL DEFAULT 100,
    bank REAL DEFAULT 0,
    -- Gang membership
    gang_id INTEGER REFERENCES gangs(id),
    -- PvP/Joust stats
    joust_wins INTEGER DEFAULT 0,
    joust_losses INTEGER DEFAULT 0,
    kills INTEGER DEFAULT 0,
    killed INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Access levels (from CONFIG)
CREATE TABLE access_levels (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    level INTEGER NOT NULL,
    time_limit INTEGER NOT NULL
);

-- Character classes
CREATE TABLE classes (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT
);

-- Weapons (54 items from CONFIG)
CREATE TABLE weapons (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    price REAL NOT NULL
);

-- Armor (27 items from CONFIG)
CREATE TABLE armor (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    price REAL NOT NULL
);

-- Homes (16 items from CONFIG)
CREATE TABLE homes (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    price REAL NOT NULL
);

-- Security (16 items from CONFIG)
CREATE TABLE security (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    price REAL NOT NULL
);

-- Spells (12 spells)
CREATE TABLE spells (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    price REAL NOT NULL,
    sp_cost INTEGER NOT NULL
);

-- Gangs
CREATE TABLE gangs (
    id INTEGER PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    leader_id INTEGER REFERENCES users(id),
    gold REAL DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Message boards
CREATE TABLE boards (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    access_level INTEGER DEFAULT 0
);

CREATE TABLE posts (
    id INTEGER PRIMARY KEY,
    board_id INTEGER REFERENCES boards(id),
    user_id INTEGER REFERENCES users(id),
    subject TEXT,
    body TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Private email
CREATE TABLE emails (
    id INTEGER PRIMARY KEY,
    from_id INTEGER REFERENCES users(id),
    to_id INTEGER REFERENCES users(id),
    subject TEXT,
    body TEXT,
    read INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Voting
CREATE TABLE votes (
    id INTEGER PRIMARY KEY,
    question TEXT NOT NULL,
    active INTEGER DEFAULT 1
);

CREATE TABLE vote_options (
    id INTEGER PRIMARY KEY,
    vote_id INTEGER REFERENCES votes(id),
    option_text TEXT NOT NULL,
    count INTEGER DEFAULT 0
);

CREATE TABLE user_votes (
    user_id INTEGER REFERENCES users(id),
    vote_id INTEGER REFERENCES votes(id),
    PRIMARY KEY (user_id, vote_id)
);

-- Daily sessions (for call tracking)
CREATE TABLE sessions (
    id INTEGER PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    date TEXT,
    calls_today INTEGER DEFAULT 1
);
```

### Server Integration

Add to root `server.js`:

```javascript
// TPro BBS routes
import tproBbsRoutes from './tprobbs/src/routes/index.js';
app.use('/tprobbs', tproBbsRoutes);
```

Update landing page (`views/index.ejs`) to include TPro BBS link.

## Game Systems

### Character Classes

| ID | Class | Stat Focus | Special |
|----|-------|------------|---------|
| 0 | No class | - | New character, must choose |
| 1 | Fighter | Stamina | +damage |
| 2 | Magician | Intellect | +spell power |
| 3 | Thief | Agility | Stealing, trap detection |
| 4 | Bard | Charisma | Balanced, social bonuses |
| 5 | Cleric | Intellect | Healing spells |
| 6 | Assassin | Agility | Critical hits |
| 7 | Jester | Charisma | Random effects |
| 8 | Barbarian | Stamina | High damage, low magic |
| 9 | Sage | Intellect | Spell efficiency |
| 10 | Alchemist | Intellect | Potion crafting |
| 11 | Hero | All | Prestige class (high level) |

### Spell System

| ID | Spell | Price | SP Cost | Effect |
|----|-------|-------|---------|--------|
| 1 | Charm | 10 | 10 | Pacify monster |
| 2 | Intuition | 100 | 25 | Detect traps |
| 3 | Strength | 1,000 | 50 | Boost damage |
| 4 | Accuracy | 10,000 | 75 | Boost hit chance |
| 5 | Shield | 100,000 | 100 | Reduce damage |
| 6 | Hone | 1,000,000 | 250 | Sharpen weapon |
| 7 | Teleport | 10,000,000 | 500 | Escape dungeon |
| 8 | Heal | 100,000,000 | 750 | Restore HP |
| 9 | Blast | 1,000,000,000 | 1000 | Magic damage |
| 10 | Resurrect | 10,000,000,000 | 2500 | Revive from death |
| 11 | Cure | 100,000,000,000 | 5000 | Remove poison |
| 12 | Disintegrate | 1,000,000,000,000 | 7500 | Instant kill |

### Dungeon System

The dungeon is a **7x7 grid** (49 rooms) with procedurally generated content per session.

#### Room Types

| Code | Type | Description |
|------|------|-------------|
| 1 | Empty | Empty chamber, chance of monster |
| 2 | Cavern | Hidden cavern with potions/scrolls |
| 3-4 | Monster | Guaranteed monster encounter |
| 5 | Thief | Thief encounter (steal or drop gold) |
| 6 | N-S Passage | North-south corridor only |
| 7 | E-W Passage | East-west corridor only |
| 8 | Trapdoor | Agility check or fall down level |
| 9 | Teleport | Choose: up, down, out, random, stay |
| 10 | Clear | Safe room |

#### Dungeon Generation

```javascript
function generateDungeon(playerLevel) {
    const grid = [];
    for (let i = 0; i < 49; i++) {
        grid[i] = {
            type: Math.floor(Math.random() * 8) + 1,
            visited: false
        };
    }
    // Place special rooms
    grid[Math.floor(Math.random() * 49)].type = 9;  // Teleporter
    grid[Math.floor(Math.random() * 49)].type = 10; // Clear room
    return grid;
}
```

#### Movement

- N/S/E/W navigation with wall detection
- Corridors restrict movement direction
- Map available if player has purchased one

### Combat System

```javascript
function calculateDamage(attacker, defender) {
    const weaponPower = weapons[attacker.weapon].power;
    const armorReduction = armor[defender.armor].protection;
    const baseDamage = Math.floor(Math.random() * weaponPower) + 1;
    const strengthBonus = Math.floor(attacker.stamina / 5);
    return Math.max(1, baseDamage + strengthBonus - armorReduction);
}

function combatRound(player, monster) {
    // Player attacks
    const playerDamage = calculateDamage(player, monster);
    monster.hp -= playerDamage;

    if (monster.hp <= 0) {
        return { winner: 'player', damage: playerDamage };
    }

    // Monster attacks
    const monsterDamage = calculateDamage(monster, player);
    player.hit_points -= monsterDamage;

    if (player.hit_points <= 0) {
        return { winner: 'monster', damage: monsterDamage };
    }

    return { winner: null, playerDamage, monsterDamage };
}
```

### Casino Games

#### Blackjack
- Standard rules
- Dealer stands on 16+
- 5-card automatic win
- Blackjack pays 2:1
- Bust loses bet

#### Craps
- 7 or 11 on first roll wins
- 2, 3, or 12 on first roll loses
- Otherwise establish point, roll until point (win) or 7 (lose)

#### In-Between
- Two cards dealt face up
- Bet that third card falls between them
- Ace can be high or low
- Pot system with partial betting

#### Slots
- Three reels with symbols
- Matching symbols pay multipliers
- Jackpot for three 7s

### Gang System

- Create gang (costs gold)
- Join existing gang
- Gang treasury (shared gold)
- Gang wars (PvP between gangs)
- Leader can kick members
- Disband gang returns treasury to leader

## Visual Design

### BBS Aesthetic

- Monospace font (Courier New, similar to Proving Grounds)
- ANSI-inspired color scheme
- ASCII box drawing for menus
- No modern UI elements - pure text interface

### Color Scheme

```css
:root {
    --bg-color: #000;
    --text-color: #aaa;
    --header-color: #0ff;      /* Cyan */
    --prompt-color: #ff0;      /* Yellow */
    --error-color: #f00;       /* Red */
    --success-color: #0f0;     /* Green */
    --highlight-color: #fff;   /* White */
}
```

### Sample Menu Layout

```
╔════════════════════════════════════════╗
║         LOST GONZO BBS - Main          ║
╠════════════════════════════════════════╣
║  [B] Message Boards                    ║
║  [E] Electronic Mail                   ║
║  [G] Game Section                      ║
║  [I] Information Section               ║
║  [M] Members List                      ║
║  [S] Settings                          ║
║  [V] Voting Booth                      ║
║  [Q] Quit / Logoff                     ║
╚════════════════════════════════════════╝

Option: _
```

## Implementation Order

### Phase 1: Core Infrastructure
- [ ] Create directory structure
- [ ] Database schema and seed data (weapons, armor, spells, classes)
- [ ] Auth routes (login, register, logout)
- [ ] Main menu route
- [ ] Base EJS layout with BBS styling
- [ ] User settings page
- [ ] Server.js integration

### Phase 2: Communication
- [ ] Message boards list
- [ ] View board posts
- [ ] Create new post
- [ ] Reply to post
- [ ] Private email inbox
- [ ] Read email
- [ ] Compose email

### Phase 3: Combat
- [ ] Dungeon grid generation
- [ ] Room rendering and navigation
- [ ] Monster encounters and combat
- [ ] Potion/scroll pickups
- [ ] Thief encounters
- [ ] Teleport chambers
- [ ] Trapdoors and level progression
- [ ] Death and resurrection
- [ ] Arena PvP combat

### Phase 4: Economy
- [ ] Casino hub menu
- [ ] Blackjack implementation
- [ ] Craps implementation
- [ ] In-Between implementation
- [ ] Slots implementation
- [ ] Weapon store
- [ ] Armor store
- [ ] Spell store
- [ ] Home store
- [ ] Security store
- [ ] Bank (deposit/withdraw)

### Phase 5: Social
- [ ] Gang creation
- [ ] Gang management (join, leave, kick)
- [ ] Gang treasury
- [ ] Gang wars
- [ ] Members list with filtering
- [ ] Voting booth

## Module Mapping Reference

| BASIC Module | Express Route | Primary Views |
|--------------|---------------|---------------|
| LOGON.BAS | routes/auth.js | login, register |
| MAIN.BAS | routes/main.js | main, settings, members, vote |
| BOARDS.BAS | routes/boards.js | list, view, post |
| EMAIL.BAS | routes/email.js | inbox, read, compose |
| DUNGEON.BAS | routes/combat.js | dungeon, battle |
| ARENA.BAS | routes/combat.js | arena, pvp |
| CASINO.BAS | routes/games.js | blackjack, craps, inbetween, slots |
| GANGS.BAS | routes/gangs.js | list, create, manage |
| GAME.BAS | routes/games.js | game menu hub |

## Notes

- File transfer functionality will NOT be ported (not relevant to web)
- The original BBS name "LOST GONZO" can be made configurable
- Access level system simplified to match web session model
- Modem-specific features (baud rate, nulls) displayed for nostalgia but non-functional
