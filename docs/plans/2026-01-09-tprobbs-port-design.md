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

**Must match Proving Grounds exactly:**

- Monospace font: Courier New, 14px
- Green monochrome color scheme (same as Proving Grounds)
- Simple ASCII box drawing with `═` characters
- CRT scanline effect overlay
- 80ch max-width terminal container
- Status bar at bottom with user stats
- Keyboard navigation for menu items

### Color Scheme (from Proving Grounds terminal.css)

```css
:root {
    --bg-color: #000000;
    --text-color: #00ff00;      /* Green */
    --dim-color: #008800;       /* Dim green */
    --bright-color: #88ff88;    /* Bright green */
    --border-color: #00aa00;    /* Border green */
    --link-color: #00ffff;      /* Cyan for links */
    --error-color: #ff0000;     /* Red */
    --warning-color: #ffff00;   /* Yellow */
    --highlight-bg: #003300;    /* Highlight background */
}
```

### CSS Strategy

**Share the existing `terminal.css`** from Proving Grounds rather than creating new styles. TPro BBS will link to the same stylesheet:

```html
<link rel="stylesheet" href="/provinggrounds/css/terminal.css">
```

Or copy/symlink the CSS to `/tprobbs/public/css/terminal.css` for independence.

### Sample Menu Layout (matching Proving Grounds style)

```
═══════════════════════════════════════════════════════
                    LOST GONZO BBS
                      Main Menu
═══════════════════════════════════════════════════════

Character: Brad                    Level: 5 (Elite User)
Gold: 1,234                        HP: 45/50

Commands

B)  Message Boards
E)  Electronic Mail
G)  Game Section
I)  Information Section
M)  Members List
S)  Settings
V)  Voting Booth
Q)  Quit / Logoff

> _

[Brad] Level: 5 Gold: 1234 HP: 45/50 Time: 58m
```

### Template Structure

Follow Proving Grounds pattern:
- Each page is a standalone HTML document (no layout partials initially)
- ASCII header box using `<pre>` in `.ascii-box` div
- Menu items using `.menu` and `.menu-item` classes
- Stats grid using `.stats` and `.stat` classes
- Status bar at bottom using `.status-bar` class
- Keyboard navigation script for single-key menu access

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

## Security Requirements

### Authentication & Sessions
- **Password hashing**: Use bcrypt with cost factor 10 (match Proving Grounds)
- **Session cookies**: httpOnly, secure (in production), sameSite: 'strict'
- **Session secret**: From environment variable, never hardcoded

### Input Validation
- **Username**: 3-25 chars, alphanumeric + underscore only
- **Password**: Minimum 6 chars
- **Message content**: Max 4000 chars for posts, 2000 for emails
- **All inputs**: Trim whitespace, reject null bytes

### Output Encoding
- **EJS templates**: Use `<%= %>` (escaped) for all user content, never `<%- %>`
- **JSON responses**: Properly escaped by default

### SQL Injection Prevention
- **All queries**: Use parameterized statements via better-sqlite3
- **Never**: String concatenation for SQL

### CSRF Protection
- Add CSRF tokens to all POST forms (use csurf middleware or manual tokens)

### Rate Limiting
- **Login**: Max 5 attempts per 15 minutes per IP
- **Registration**: Max 3 per hour per IP
- **Message posting**: Max 10 per minute per user

## Performance Requirements

### Database Indexes

Add to schema:
```sql
CREATE INDEX idx_posts_board_id ON posts(board_id);
CREATE INDEX idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX idx_emails_to_id ON emails(to_id);
CREATE INDEX idx_emails_from_id ON emails(from_id);
CREATE INDEX idx_users_gang_id ON users(gang_id);
CREATE INDEX idx_users_level ON users(level DESC);
CREATE INDEX idx_sessions_user_date ON sessions(user_id, date);
```

### Pagination
- **Message boards**: 20 posts per page
- **Members list**: 25 users per page
- **Email inbox**: 20 emails per page
- Use LIMIT/OFFSET with total count for page navigation

### Dungeon State
- Store dungeon grid in session (JSON, ~2KB max)
- Clear on dungeon exit or logout
- Timeout after 30 minutes of inactivity

## Missing Schema Additions

### Monsters Table
```sql
CREATE TABLE monsters (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    min_level INTEGER DEFAULT 1,    -- Minimum dungeon level to appear
    max_hp INTEGER NOT NULL,
    damage INTEGER NOT NULL,        -- Base damage
    armor INTEGER DEFAULT 0,        -- Damage reduction
    xp_reward INTEGER NOT NULL,
    gold_min INTEGER DEFAULT 0,
    gold_max INTEGER DEFAULT 100
);
```

### Items Table (for dungeon pickups)
```sql
CREATE TABLE items (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL,             -- 'map', 'potion', 'scroll'
    effect TEXT,                    -- JSON description of effect
    price INTEGER DEFAULT 0
);
```

## Game Mechanics Details

### Experience & Leveling
```javascript
// XP required for each level (exponential curve)
function xpForLevel(level) {
    return Math.floor(100 * Math.pow(1.5, level - 1));
}

// XP from monster kill
function monsterXP(monster, playerLevel) {
    const base = monster.xp_reward;
    const levelDiff = monster.min_level - playerLevel;
    const multiplier = Math.max(0.1, 1 + (levelDiff * 0.1));
    return Math.floor(base * multiplier);
}
```

### Death & Resurrection
1. **On death**: Status set to 0 (dead), cannot enter dungeon or arena
2. **Resurrection options**:
   - Self-cast Resurrect spell (if owned, costs 2500 SP)
   - Pay gold at Temple (cost = level * 1000)
   - Another player casts Resurrect on you
3. **On resurrection**: HP restored to 50%, SP restored to 25%

### Daily Call Limits
```javascript
// Check if user can play today
function canPlay(user, session) {
    const today = new Date().toISOString().split('T')[0];
    if (session.date !== today) {
        // New day, reset
        return { allowed: true, callsToday: 1 };
    }
    const accessLevel = accessLevels[user.access_level];
    const maxCalls = accessLevel.calls_per_day || 3;
    return {
        allowed: session.calls_today < maxCalls,
        callsToday: session.calls_today + 1
    };
}
```

### Combat Flow (Web UI)

**Option A: Auto-resolve with log**
- Single POST to `/combat/fight`
- Server runs all rounds, returns full combat log
- Display log with CSS animation (typewriter effect)

**Option B: Round-by-round (more faithful)**
- Each round is a POST with action choice (Attack, Cast, Flee)
- Combat state stored in session
- More interactive but more requests

Recommend **Option A** for simplicity, with flee option before combat starts.

## Web Usability Enhancements

### Responsive Design
```css
/* Add to terminal.css or tprobbs-specific CSS */
@media (max-width: 480px) {
    .terminal {
        padding: 5px;
        font-size: 12px;
    }
    .stats {
        grid-template-columns: 1fr;
    }
    .dungeon-map {
        font-size: 10px;
    }
}
```

### Dungeon Map Display
```html
<!-- Use CSS grid for cleaner 7x7 display -->
<div class="dungeon-map" style="display: grid; grid-template-columns: repeat(7, 1fr);">
    <% for (let i = 0; i < 49; i++) { %>
        <div class="room <%= i === currentRoom ? 'current' : '' %> <%= grid[i].visited ? 'visited' : '' %>">
            <%= roomSymbol(grid[i].type) %>
        </div>
    <% } %>
</div>
```

### Navigation
- Every page includes "Back" link to previous logical page
- Main menu always accessible via header link
- Breadcrumbs for nested pages (Stores > Weapons)

### Error Pages
- `views/pages/error.ejs` - Generic error with message
- 404: "You've wandered into an empty void..."
- 500: "The dungeon has collapsed! Try again."

## Notes

- File transfer functionality will NOT be ported (not relevant to web)
- The original BBS name "LOST GONZO" can be made configurable
- Access level system simplified to match web session model
- Modem-specific features (baud rate, nulls) displayed for nostalgia but non-functional
