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

-- Weapons (54 items from CONFIG - see Complete Equipment Tables)
CREATE TABLE weapons (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    price REAL NOT NULL
);

-- Armor (27 items from CONFIG - see Complete Equipment Tables)
CREATE TABLE armor (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    price REAL NOT NULL
);

-- Homes (16 items from CONFIG - see Complete Equipment Tables)
CREATE TABLE homes (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    price REAL NOT NULL
);

-- Security (16 items from CONFIG - see Complete Equipment Tables)
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

### Character Creation (from GAME.BAS lines 24100-24200)

New characters receive **200 ability points** to distribute between four stats:
- Each stat must be between **20 and 80**
- Starting HP: 15 (all classes)
- Starting SP: 15 (spell-casting classes only: Magician, Bard, Cleric, Jester, Sage, Hero)
- Starting equipment: Weapon #1 (Hands), Armor #1 (Skin)
- Starting gold: weapon price (effectively 0 for Hands)

### Character Classes (from LOGON.BAS line 1520)

| ID | Class | Spell Type | Can Backstab | Notes |
|----|-------|------------|--------------|-------|
| 0 | No class | None | No | Must choose class to fight |
| 1 | Fighter | None | No | +damage bonus (classes 1,4,5,6,8,11) |
| 2 | Magician | Spells | No | Full spell power, no combat bonus |
| 3 | Thief | Poisons | Yes (3x) | Backstab multiplier 3x |
| 4 | Bard | Scrolls | Yes (2x) | Scrolls consumed on cast, +damage bonus |
| 5 | Cleric | Spells | No | Full spell power, +damage bonus |
| 6 | Assassin | Poisons | Yes (2x) | Can backstab, +damage bonus |
| 7 | Jester | Spells | Yes (2x) | Can backstab |
| 8 | Barbarian | None | No | Highest +damage bonus, no magic |
| 9 | Sage | Spells | No | Reduced SP cost (0.8x), reduced damage (0.8x) |
| 10 | Alchemist | Poisons | No | No backstab |
| 11 | Hero | Spells | Yes (3x) | Backstab 3x, +damage bonus, full magic |

### Spell System (from LOGON.BAS lines 3000-3010)

Spell prices scale with weapon[1] base price. SP costs modified by class (Sage gets 0.8x).

| ID | Spell | Base Price Multiplier | SP Cost | Effect (from DUNGEON.BAS 12200-12750) |
|----|-------|----------------------|---------|-------|
| 1 | Charm | 10 | 10 | +RND(10) Charisma (max 100) |
| 2 | Intuition | 100 | 25 | +RND(10) Intellect (max 100) |
| 3 | Strength | 1,000 | 50 | +RND(10) Stamina (max 100) |
| 4 | Accuracy | 10,000 | 75 | +RND(10) Agility (max 100) |
| 5 | Shield | 100,000 | 100 | Reduce incoming damage |
| 6 | Hone | 1,000,000 | 250 | Increase weapon effectiveness |
| 7 | Teleport | 10,000,000 | 500 | Exit dungeon safely |
| 8 | Heal | 100,000,000 | 750 | Restore HP |
| 9 | Blast | 1,000,000,000 | 1000 | Deal magic damage |
| 10 | Resurrect | 10,000,000,000 | 2500 | Revive from death (self or other) |
| 11 | Cure | 100,000,000,000 | 5000 | Cure poison status |
| 12 | Disintegrate | 1,000,000,000,000 | 7500 | Attempt instant kill |

**Spell failure chance** (from DUNGEON.BAS line 12140): `RND(100) + 10 * (class != 2) - 20 * (class == 9 or class == 11) - 10 * (enemy_class == 8) > Intellect`

### Dungeon System (from DUNGEON.BAS)

The dungeon uses **7 parallel arrays** (MA, MC, MD, MF, MN, MR, MS) representing 7 dungeon levels, each a **7x7 grid** (49 rooms). Teleporting up/down shifts arrays.

#### Room Types (from lines 2000-10000)

| Code | Type | Description |
|------|------|-------------|
| 1 | Empty | "empty/barren/quiet chamber" - 5% monster chance |
| 2 | Cavern | Hidden cavern - 10% potion, else chance of spell scroll |
| 3-4 | Monster | "something lurking" - guaranteed monster encounter |
| 5 | Thief | 33% chance thief drops gold, else steals gold/4 |
| 6 | N-S Passage | North-south corridor only (locks if entered E/W) |
| 7 | E-W Passage | East-west corridor only (locks if entered N/S) |
| 8 | Trapdoor | Agility check (RND(100)+20 > AG) or fall down 1 level |
| 9 | Teleport | Choose: Up, Down, Out, Random, Stay |
| 10 | Cleric | Safe room - offers healing for gold (HP-Z1) * 2^((LV+1)/(100/BW)) * WP[1] * 250 / HP |

#### Dungeon Generation (from lines 100-270)

```javascript
function generateDungeon(playerLevel) {
    // 7 levels, each 49 rooms
    const levels = [[], [], [], [], [], [], []];
    for (let lvl = 0; lvl < 7; lvl++) {
        levels[lvl][0] = 0; // Room 0 unused
        for (let i = 1; i <= 49; i++) {
            levels[lvl][i] = Math.floor(Math.random() * 8) + 1; // Types 1-8
        }
        // Place teleporter and cleric on each level
        levels[lvl][Math.floor(Math.random() * 49) + 1] = 10; // Cleric
        levels[lvl][Math.floor(Math.random() * 49) + 1] = 9;  // Teleporter
    }
    return {
        currentLevel: playerLevel + Math.floor(Math.random() * 11) - 6, // LL = LV + RND(11) - 6
        levels,
        currentRoom: 25, // Start center (ML = 25)
        previousRoom: 18  // MX = 18
    };
}
```

#### Movement (from lines 1200-1370)

- N/S/E/W navigation with wall detection at grid edges
- N-S passages (type 6) block E/W movement
- E-W passages (type 7) block N/S movement
- Secret doors: entering corridor from blocked direction locks behind you
- Map shows room codes if player has found one (type 10 room grants map)

#### Navigation Controls

`<N>orth, <S>outh, <E>ast, <W>est, <C>ast, <P>oison, <M>ap, <Y>our stats`

### Combat System (from DUNGEON.BAS lines 11000-11400)

#### Initiative (line 11010)
```javascript
// Monster gets first swing if: RND(Agility) > RND(monsterAgility) OR player name == sysop
const monsterFirst = (Math.random() * 100 > player.agility + Math.random() * 100 - monster.agility);
```

#### Backstab (lines 11030-11070)
Classes 3 (Thief), 4 (Bard), 6 (Assassin), 7 (Jester), 11 (Hero) can attempt backstab:
```javascript
// Backstab available for: CL=3, CL=4, CL=6, CL=7, CL=11
const canBackstab = [3, 4, 6, 7, 11].includes(player.class);

// Backstab attempt: RND(100) > Agility = fail
if (Math.random() * 100 > player.agility) {
    // Fail - monster gets first swing
} else {
    // Success - damage * 2 (or *3 for class 3 or 11)
    // Line 11060: AA = AA * (2 + (CL=3 OR CL=11) * 2)
    const multiplier = (player.class === 3 || player.class === 11) ? 3 : 2;
    damage *= multiplier;
}
```

#### Damage Formula (line 11050, 11110)
```javascript
function calculateDamage(attacker, defender) {
    // Base damage: (4 * weaponLevel + level + stamina/10 - defenderArmor) / 2
    let base = (4 * attacker.weapon + attacker.level + attacker.stamina / 10 - defender.armor) / 2;
    // Add random variance
    let damage = base + Math.random() * (Math.abs(base) + 1);
    damage = Math.max(1, Math.floor(damage));

    // Class bonuses (lines 11120-11126)
    if ([1, 4, 5, 6, 8, 11].includes(attacker.class)) {
        const bonus = 1 + 2 * ([1, 8, 11].includes(attacker.class)) + ([8, 11].includes(attacker.class));
        damage += Math.random() * attacker.level * bonus;
    }
    if (attacker.class === 9) damage *= 0.8; // Sage penalty

    // Spell effects (Shield spell reduces by 0.8, Hone increases by 1.2)
    return Math.max(1, Math.floor(damage));
}
```

#### Hit Chance (line 11100, 11200)
```javascript
// Miss if: RND(100) > (Agility/2 + 50)
const missChance = Math.random() * 100 > (attacker.agility / 2 + 50);
```

#### Combat Options
`<A> Attack, <C> Cast spell, <R> Retreat, <S> Status`

#### Monster Stats Generation (lines 20100-20160)
```javascript
function generateMonster(dungeonLevel, monsterIndex, monsterClass) {
    const level = Math.min(99, dungeonLevel);

    // HP formula (line 20110)
    let hp = 15;
    for (let i = 2; i <= level; i++) {
        hp += 9 - (i > 5) - (i > 15) - (i > 25) + Math.random() * i + i;
    }
    hp = Math.floor(hp / 4);
    if (dungeonLevel === 1) hp = 4;

    // SP only for spell-casting classes
    let sp = 0;
    if ([2, 4, 5, 7, 9, 11].includes(monsterClass)) {
        sp = 15;
        for (let i = 2; i <= level; i++) {
            sp += 9 - (i > 5) - (i > 15) - (i > 25) + Math.random() * i + i;
        }
        sp = Math.floor(sp / 4);
        if (dungeonLevel === 1) sp = 4;
    }

    // Gold reward (line 20150)
    const baseGold = weapons[player.weapon].price / 10;
    const gold = baseGold + Math.random() * baseGold;

    return { hp, sp, gold, level, class: monsterClass || player.class };
}
```

#### Monster Table (from DUNGEON.BAS lines 59000-59100)

100 monsters with format: `name, class`. Class determines spell-casting ability:
- Class 0: No abilities (doppleganger)
- Class 1: Fighter-type (no spells)
- Class 4: Spell-caster (Blast, Heal)
- Class 5: Powerful magic users
- Class 8: Brute/Barbarian (+damage bonus)
- Class 9: Sage-type (reduced SP cost)

| # | Monster | Class | # | Monster | Class |
|---|---------|-------|---|---------|-------|
| 1 | goblin | 1 | 51 | carrion crawler | 1 |
| 2 | orc | 1 | 52 | manticore | 1 |
| 3 | kobold | 1 | 53 | troll | 4 |
| 4 | hobgoblin | 1 | 54 | wight | 4 |
| 5 | bullywug | 1 | 55 | wraith | 4 |
| 6 | xvart | 1 | 56 | basilisk | 1 |
| 7 | caveman | 1 | 57 | wyvern | 8 |
| 8 | norker | 1 | 58 | medusa | 4 |
| 9 | skeleton | 1 | 59 | drider | 1 |
| 10 | zombie | 1 | 60 | ogre mage | 4 |
| 11 | giant centipede | 1 | 61 | hill giant | 8 |
| 12 | gnoll | 1 | 62 | tunnel worm | 1 |
| 13 | stirge | 1 | 63 | hydra | 8 |
| 14 | troglodyte | 1 | 64 | mimic | 1 |
| 15 | lizard man | 1 | 65 | succubus | 5 |
| 16 | crabman | 1 | 66 | mind flayer | 5 |
| 17 | mongrelman | 1 | 67 | mummy | 4 |
| 18 | ogrillon | 8 | 68 | neo-otyugh | 8 |
| 19 | githzerai | 5 | 69 | roper | 1 |
| 20 | kuo-toa | 5 | 70 | umber hulk | 8 |
| 21 | bugbear | 8 | 71 | pyrohydra | 8 |
| 22 | ghoul | 4 | 72 | will-o-wisp | 4 |
| 23 | ogre | 8 | 73 | vampire | 5 |
| 24 | firedrake | 4 | 74 | ghost | 4 |
| 25 | drow | 4 | 75 | dracolisk | 5 |
| 26 | firenewt | 4 | 76 | naga | 4 |
| 27 | harpy | 1 | 77 | xag-ya | 4 |
| 28 | ophidian | 1 | 78 | xeg-yi | 4 |
| 29 | phantom | 4 | 79 | minor demon | 4 |
| 30 | worg | 1 | 80 | green dragon | 5 |
| 31 | gargoyle | 4 | 81 | red dragon | 5 |
| 32 | rust monster | 1 | 82 | stone golem | 8 |
| 33 | ghast | 4 | 83 | nycadaemon | 5 |
| 34 | werewolf | 4 | 84 | titan | 8 |
| 35 | owlbear | 1 | 85 | demilich | 9 |
| 36 | firetoad | 4 | 86 | pit fiend | 5 |
| 37 | hall hound | 4 | 87 | lernaean hydra | 8 |
| 38 | hook horror | 1 | 88 | major demon | 5 |
| 39 | anhkheg | 8 | 89 | mist dragon | 5 |
| 40 | githyanki | 5 | 90 | grey slaad | 4 |
| 41 | cave bear | 8 | 91 | beholder | 5 |
| 42 | cockatrice | 4 | 92 | iron golem | 8 |
| 43 | minotaur | 8 | 93 | death slaad | 4 |
| 44 | displacer beast | 1 | 94 | cloud dragon | 5 |
| 45 | doppleganger | 0 | 95 | lich | 9 |
| 46 | imp | 4 | 96 | elder titan | 8 |
| 47 | quasit | 4 | 97 | slaad lord | 5 |
| 48 | ice lizard | 1 | 98 | demon prince | 5 |
| 49 | svirfneblin | 1 | 99 | arch devil | 5 |
| 50 | yeti | 1 | 100 | elemental prince | 5 |

Monster selection in dungeon (line 20100): `monsterIndex = RND(100) + 1`

#### XP Reward (line 20500)
```javascript
const xp = Math.floor(Math.pow(2, monsterLevel + 2) * 1000 / 15);
```

### Arena PvP Combat (from ARENA.BAS)

#### Fight Limits
- **2 fights per call** (line 10000: `F1+2`)
- Access level check: bit 7 in access flags must allow fighting

#### Target Restrictions (line 10130)
```javascript
// Can only attack players higher level or up to 3 levels below
if (targetLevel + 3 < playerLevel) {
    return "You can only attack someone higher or up to three levels below you.";
}
```

#### Death Check (line 10140)
Before combat, system checks if target was recently killed:
```javascript
// KO% = day*2 + hour/12 timestamp of last death
// If target was killed within last ~12 hours, show who killed them
if (target.KO === currentDay * 2 + Math.floor(currentHour / 12)) {
    return `${target.name} was killed by ${killer.name}`;
}
```

#### Combat Flow (lines 11000-11400)
Same damage formulas as dungeon combat:
- Initiative: `RND(playerAgility) > RND(targetAgility)` = player first
- Backstab: Classes 3, 4, 6, 7, 11 can attempt (same as dungeon)
- Hit chance: `RND(100) > Agility/2 + 50` = miss
- Damage: `(4*weaponLevel + level + stamina/10 - targetArmor) / 2 + variance`

#### Victory Rewards (lines 10500-10560)
```javascript
// Winner gets loser's gold
winner.gold += loser.gold;
loser.gold = 0;

// Winner gets XP based on loser's level
const xp = Math.floor(Math.pow(2, loserLevel + 2) * 1000 / 3);
winner.xp += xp;

// Weapon: if loser's weapon > winner's, winner takes it
// Otherwise, winner sells it for (price * (50 + charisma/2) / 100)

// Armor: same logic as weapon
```

#### Top 20 Leaderboard (lines 200-240, 10600-10680)
- Sorted by total XP earned in arena
- Updated after each kill
- Stored in `TOP` file with user number and XP

#### Kill History (lines 300-340, 13000-13080)
- Last 50 kills recorded with timestamp
- Format: `"PlayerA killed PlayerB at HH:MM on MM/DD/YY"`

### Casino Games (from CASINO.BAS)

#### Blackjack (lines 1000-1220)
- Cards 1-13 (Ace=1 or 14, 2-10, J=11, Q=12, K=13)
- Dealer blackjack (Ace + face card) = player loses **double**
- Player blackjack = player wins **double**
- Bust (>21) = lose
- 5-card hand without busting = automatic win
- Dealer stands on **16+** (not 17)
- Tie = no winner, bet returned

#### Craps (lines 2000-2240)
- 7 or 11 on first roll = "Natural", win bet
- 2, 3, or 12 on first roll = "Craps", lose bet
- Any other value = establish "point"
- Keep rolling until point (win) or 7 (lose)

#### In-Between (lines 3000-3290)
- Two cards dealt, determine low/high
- Ace is low if other card ≤7, else high
- Bet on third card falling strictly between
- Pot system: player contributes 2x bet to pot
- Win = take bet from pot
- Lose = add bet to pot
- Dealer also plays (bets pot * (spread-1) / 13)

#### Slots (lines 4000-4110)
- 3 reels, 6 symbols each
- All 3 match = **5x** jackpot
- Left 2 match OR right 2 match OR outsides match = **1x** bet

#### Roulette (lines 5000-5160)
- 38 slots (1-36 + 0 + 00)
- Bet on number = **36x** payout
- Bet on Odd/Even = **1x** payout

#### Horse Racing (lines 6000-6210)
- 11 horses (names from DATA)
- Pick a horse, place bet
- Winner pays **10x**

#### Russian Roulette (line 7000+)
- High-risk gambling game

### Gang System (from GANGS.BAS)

#### Gang Structure
- **4 members per gang** (leader + 3 others)
- Leader creates gang and invites 3 others by username
- Gang name: 3-25 characters
- No creation cost (free to form)

#### Gang Activation (lines 2050-2300)
1. Leader creates gang, specifying 3 other member usernames
2. System sends notes to invited members
3. Each invited member must log on and accept invitation via "Join" menu
4. Gang becomes **active** only when all 4 members have accepted
5. Until active, gang cannot participate in gang fights

#### Gang Menu Options
- **J) Join** - Accept invitation to an existing gang
- **R) Resign** - Leave current gang (leader cannot resign without transferring or dissolving)
- **S) Start** - Create new gang (must not be in one already)
- **L) List** - View all gangs and their members
- **F) Fight** - Gang war (once per call, line 10015: `F5=1`)
- **E) Edit** - Leader-only: Replace member, Dissolve gang, Transfer leadership

#### Gang Fight Mechanics (lines 10000-14000)
- **Once per call limit**: Each user can only initiate one gang fight per session
- Both gangs' members loaded with full stats (HP, SP, weapon, armor, class, level)
- Combat is **round-by-round** with random attack order
- Each round, each living member attacks a random enemy
- Hit/miss and damage use same formulas as arena combat
- Victory when all 4 opposing members reach 0 HP
- **Rewards**: Winning gang splits XP and gold from losing gang
- **XP formula** (line 12010): `2^(loserLevel + 2) * 1000 / 3` per winner
- **Gold formula**: Equal split of losers' combined gold

#### Member Resignation (lines 8000-8070)
- Non-leaders can resign freely
- Resigned member slot marked "Resigned" with member number = 0
- Gang status recalculated (may become inactive if not enough members)

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
-- Monsters from DUNGEON.BAS lines 59000-59100
-- Stats are generated dynamically based on dungeon level, not stored
CREATE TABLE monsters (
    id INTEGER PRIMARY KEY,         -- 1-100
    name TEXT NOT NULL,
    class INTEGER NOT NULL          -- Determines spell casting: 0=none, 1=fighter, 4=caster, 5=powerful, 8=brute, 9=sage
);
-- HP, SP, gold are calculated at encounter time based on dungeon level (see Monster Stats Generation)
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

### Experience & Leveling (from GAME.BAS line 30020)

```javascript
// XP required for next level (from source: 2^(LV+1) * (1100 + IN*2))
// Note: Higher intellect = MORE XP needed to level up
function xpForNextLevel(currentLevel, intellect) {
    return Math.floor(Math.pow(2, currentLevel + 1) * (1100 + intellect * 2));
}

// Level up check
function canLevelUp(player) {
    return player.xp > xpForNextLevel(player.level, player.intellect);
}

// XP from monster kill (DUNGEON.BAS line 20500)
function monsterXP(dungeonLevel) {
    return Math.floor(Math.pow(2, dungeonLevel + 2) * 1000 / 15);
}

// XP from PvP kill (ARENA.BAS line 10500)
function pvpXP(loserLevel) {
    return Math.floor(Math.pow(2, loserLevel + 2) * 1000 / 3);
}
```

### Death & Resurrection (from ARENA.BAS, DUNGEON.BAS)

**Death timestamp** (KO% field):
```javascript
// KO% = day * 2 + Math.floor(hour / 12)
// Non-zero KO% matching current timestamp = dead
const deathTimestamp = dayOfYear * 2 + Math.floor(hour / 12);
```

**Death check** (line 10140):
```javascript
function isDead(player) {
    const currentTimestamp = dayOfYear * 2 + Math.floor(hour / 12);
    return player.KO === currentTimestamp;
}
```

**Resurrection** (spell 10, line 12650-12680):
- Cannot be cast during battle (must be outside combat)
- Target player by user number
- Sets KO% = 0 (clears death status)
- No HP/SP restoration - use Heal spell (8) or Cure spell (11) after

**Cure spell** (spell 11, line 12700):
- Restores HP to full max (`Z1 = HP`)
- Different from Heal which adds HP up to max

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

**Round-by-round** (matches original source behavior):
- Each round is a POST with action choice: `(A) Attack, (C) Cast spell, (R) Retreat, (Y) Your status`
- Combat state stored in session (current HP, SP, monster HP, monster SP)
- Player chooses action each round
- Monster may cast spells (Heal, Blast) if it has SP and appropriate class
- Continue until one side reaches 0 HP or player retreats

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

## Complete Equipment Tables (from CONFIG)

### Weapons (54 items)

| ID | Name | Price |
|----|------|-------|
| 1 | Hands | 0 |
| 2 | Dart | 1 |
| 3 | Sling | 2 |
| 4 | Dagger | 5 |
| 5 | Staff | 10 |
| 6 | Club | 25 |
| 7 | Hammer | 50 |
| 8 | Mace | 100 |
| 9 | Flail | 250 |
| 10 | Spear | 500 |
| 11 | Axe | 1,000 |
| 12 | Harpoon | 2,500 |
| 13 | Short Bow | 5,000 |
| 14 | War Hammer | 10,000 |
| 15 | Battle Axe | 25,000 |
| 16 | Light Crossbow | 50,000 |
| 17 | Javelin | 100,000 |
| 18 | Short Sword | 250,000 |
| 19 | Long Bow | 500,000 |
| 20 | Long Sword | 1,000,000 |
| 21 | Heavy Crossbow | 2,500,000 |
| 22 | Scimitar | 5,000,000 |
| 23 | Pole Arm | 10,000,000 |
| 24 | Broad Sword | 25,000,000 |
| 25 | Trident | 50,000,000 |
| 26 | Two-Handed Sword | 100,000,000 |
| 27 | Gloves of Strength | 250,000,000 |
| 28 | Dart of Homing | 500,000,000 |
| 29 | Sling of Seeking | 1E+09 |
| 30 | Dagger of Venom | 2.5E+09 |
| 31 | Staff of Striking | 5E+09 |
| 32 | Hammer of Throwing | 1E+10 |
| 33 | Mace of Disruption | 2.5E+10 |
| 34 | Axe of Hurling | 5E+10 |
| 35 | Hammer of Thunderbolts | 1E+11 |
| 36 | Axe of Lords | 2.5E+11 |
| 37 | Crossbow of Distance | 5E+11 |
| 38 | Sword of Quickness | 1E+12 |
| 39 | Arrows of Slaying | 2.5E+12 |
| 40 | Sword of Sharpness | 5E+12 |
| 41 | Crossbow of Accuracy | 1E+13 |
| 42 | Scimitar of Speed | 2.5E+13 |
| 43 | Sword of Wounding | 5E+13 |
| 44 | Trident of Submission | 1E+14 |
| 45 | Vorpal Sword | 2.5E+14 |
| 46 | Wand of Wonder | 5E+14 |
| 47 | Rod of Smiting | 1E+15 |
| 48 | Sword of Life Stealing | 2.5E+15 |
| 49 | Wand of Lightning | 5E+15 |
| 50 | Ring of Shooting Stars | 1E+16 |
| 51 | Staff of the Magi | 2.5E+16 |
| 52 | S.K.U.D. Missle | 5E+16 |
| 53 | Conventional Warhead Missle | 1E+17 |
| 54 | Chemical Warhead Missle | 2.5E+17 |
| 55 | Nuclear Warhead Missle | 5E+17 |

**Note:** Weapon #1 (Hands, price=0) is the base weapon. WP(1) is used in formulas.

### Armor (27 items)

| ID | Name | Price |
|----|------|-------|
| 1 | Skin | 0 |
| 2 | Wooden Shield | 1 |
| 3 | Small Shield | 5 |
| 4 | Large Shield | 10 |
| 5 | Leather | 50 |
| 6 | Padded Leather | 100 |
| 7 | Studded Leather | 500 |
| 8 | Ring Mail | 1,000 |
| 9 | Scale Mail | 5,000 |
| 10 | Chain Mail | 10,000 |
| 11 | Splint Mail | 50,000 |
| 12 | Banded Mail | 100,000 |
| 13 | Bronze Plate Mail | 500,000 |
| 14 | Normal Plate Mail | 1,000,000 |
| 15 | Field Plate Armor | 5,000,000 |
| 16 | Full Plate Armor | 10,000,000 |
| 17 | Dancing Shield | 50,000,000 |
| 18 | Dragon Scale Mail | 100,000,000 |
| 19 | Elfin Chain Mail | 500,000,000 |
| 20 | Minthral Plate Armor | 1E+09 |
| 21 | Cloak of Elvenkind | 5E+09 |
| 22 | Robe of Blending | 1E+10 |
| 23 | Adamantite Plate Mail | 5E+10 |
| 24 | Cloak of Displacement | 1E+11 |
| 25 | Cube of Force | 5E+11 |
| 26 | Ring of Invisibility | 1E+12 |
| 27 | Patriot Missles | 5E+12 |
| 28 | Nuclear Proof Bunker | 1E+13 |

### Homes (16 items)

| ID | Name | Price |
|----|------|-------|
| 0 | Alley | 0 |
| 1 | Cardboard box | 100 |
| 2 | Cave | 1,000 |
| 3 | Stable | 10,000 |
| 4 | Shed | 100,000 |
| 5 | Shack | 1,000,000 |
| 6 | Barn | 10,000,000 |
| 7 | Cabin | 100,000,000 |
| 8 | Room above tavern | 1E+09 |
| 9 | Apartment | 1E+10 |
| 10 | House | 1E+11 |
| 11 | Tower | 1E+12 |
| 12 | Mansion | 1E+13 |
| 13 | Castle | 1E+14 |
| 14 | Palace | 1E+15 |
| 15 | Fortress | 1E+16 |

### Security Items (16 items)

| ID | Name | Price |
|----|------|-------|
| 0 | Whisky bottle | 0 |
| 1 | Baseball bat | 100 |
| 2 | Padlock | 1,000 |
| 3 | Dead bolt lock | 10,000 |
| 4 | Trip-wire trap | 100,000 |
| 5 | Dog | 1,000,000 |
| 6 | Fence | 10,000,000 |
| 7 | Barbed wire fence | 100,000,000 |
| 8 | Brick wall | 1E+09 |
| 9 | Shotgun | 1E+10 |
| 10 | Burglar alarm | 1E+11 |
| 11 | Security guard | 1E+12 |
| 12 | Guard tower | 1E+13 |
| 13 | Moat | 1E+14 |
| 14 | Troops | 1E+15 |
| 15 | Magical barrier | 1E+16 |

### Access Levels (11 levels, from CONFIG)

| ID | Name | Calls/Day | Time Limit (min) |
|----|------|-----------|------------------|
| 0 | Deceased | 0 | 0 |
| 1 | Guest User | 1 | 10 |
| 2 | New User | 2 | 15 |
| 3 | Prisoner | 1 | 15 |
| 4 | Probation | 2 | 20 |
| 5 | Normal | 5 | 60 |
| 6 | Elite User | 6 | 90 |
| 7 | Contributor | 7 | 90 |
| 8 | Visiting Sysop | 8 | 90 |
| 9 | Co-Sysop | 9 | 240 |
| 10 | Sysop | 9 | 1440 |

## Level-Up Mechanics (from GAME.BAS lines 40000-40200)

### Level-Up Requirements

```javascript
// XP needed for next level (line 30020)
function xpForNextLevel(level, intellect) {
    return Math.pow(2, level + 1) * (1100 + intellect * 2);
}
```

**Note:** Higher intellect = MORE XP required to level up (intellect affects learning curve).

### Level-Up HP Gain (line 40040)

```javascript
// HP gain formula: INT(Stamina/10) + RND(Level) + Level
function hpGainOnLevelUp(stamina, level) {
    const gain = Math.floor(stamina / 10) + Math.floor(Math.random() * level) + level;
    return Math.min(gain, 9999 - currentHP); // Cap total at 9999
}
```

### Level-Up SP Gain (line 40080)

Only for spell-casting classes (2=Magician, 4=Bard, 5=Cleric, 7=Jester, 9=Sage, 11=Hero):

```javascript
// SP gain formula: INT(Intellect/10) + RND(Level) + Level
function spGainOnLevelUp(intellect, level, playerClass) {
    if (![2, 4, 5, 7, 9, 11].includes(playerClass)) return 0;
    const gain = Math.floor(intellect / 10) + Math.floor(Math.random() * level) + level;
    return Math.min(gain, 9999 - currentSP); // Cap total at 9999
}
```

### Stat Bonuses Per Level (lines 40110-40140)

Each level grants +1 to specific stats based on class:

| Class | Stamina | Intellect | Agility | Charisma |
|-------|---------|-----------|---------|----------|
| 1 - Fighter | +1 | - | - | - |
| 2 - Magician | - | +1 | - | - |
| 3 - Thief | - | - | +1 | - |
| 4 - Bard | - | - | - | - |
| 5 - Cleric | - | - | - | - |
| 6 - Assassin | - | - | - | - |
| 7 - Jester | - | - | - | - |
| 8 - Barbarian | +1 | - | - | - |
| 9 - Sage | - | +1 | - | - |
| 10 - Alchemist | - | - | +1 | - |
| 11 - Hero | +1 | +1 | +1 | +1 |

**Code:**
```javascript
function applyStatBonuses(player) {
    const cl = player.class;
    if ([1, 8, 11].includes(cl)) player.stamina = Math.min(99, player.stamina + 1);
    if ([2, 9, 11].includes(cl)) player.intellect = Math.min(99, player.intellect + 1);
    if ([3, 10, 11].includes(cl)) player.agility = Math.min(99, player.agility + 1);
    if (cl === 11) player.charisma = Math.min(99, player.charisma + 1);
}
```

## Complete Spell Effects (from DUNGEON.BAS lines 12200-12750)

| ID | Spell | SP Cost | Effect Formula |
|----|-------|---------|----------------|
| 1 | Charm | 10 | `Charisma += RND(10)`, cap 100 |
| 2 | Intuition | 25 | `Intellect += RND(10)`, cap 100 |
| 3 | Strength | 50 | `Stamina += RND(10)`, cap 100 |
| 4 | Accuracy | 75 | `Agility += RND(10)`, cap 100 |
| 5 | Shield | 100 | `Armor += 1` (temporary) |
| 6 | Hone | 250 | `Weapon += 1` (temporary) |
| 7 | Teleport | 500 | Exit combat/dungeon safely |
| 8 | Heal | 750 | `HP += SUM(RND(15) for i=1..Level)`, cap Max HP |
| 9 | Blast | 1000 | Damage = `SUM(RND(17 - 3*(enemy is Barbarian)) for i=1..Level)` |
| 10 | Resurrect | 2500 | Clear KO% flag on target player (must be outside combat) |
| 11 | Cure | 5000 | `HP = Max HP` (full restore) |
| 12 | Disintegrate | 7500 | Enemy HP = 0 (instant kill, can fail) |

### SP Cost Modifier (Sage/Hero)

Classes 9 (Sage) and 11 (Hero) get reduced SP cost:

```javascript
function getSpellCost(baseSpCost, playerClass) {
    if (playerClass === 9 || playerClass === 11) {
        return Math.floor(baseSpCost * 0.8); // 20% discount
    }
    return baseSpCost;
}
```

### Spell Failure Chance (line 12140)

```javascript
function spellFails(caster, enemy) {
    const roll = Math.floor(Math.random() * 100);
    let threshold = roll + 10 * (caster.class !== 2);  // +10 if not Magician
    threshold -= 20 * (caster.class === 9 || caster.class === 11); // -20 for Sage/Hero
    threshold -= 10 * (enemy.class === 8); // -10 if enemy is Barbarian
    return threshold > caster.intellect;
}
```

## Store Buy/Sell Mechanics (from GAME.BAS)

### Buying Equipment

Players can buy equipment if they have enough gold.

### Selling Equipment

Sell price is based on charisma (line 10550 in ARENA.BAS):

```javascript
function getSellPrice(itemPrice, charisma) {
    return Math.floor(itemPrice * (50 + charisma / 2) / 100);
}
```

- Minimum sell price: 50% of item price (at 0 Charisma)
- Maximum sell price: 100% of item price (at 100 Charisma)

### Equipment Transfer in PvP (ARENA.BAS lines 10500-10560)

When killing another player:
1. If loser's weapon > winner's weapon → winner takes weapon
2. Otherwise → winner sells it for `itemPrice * (50 + charisma/2) / 100`
3. Same logic for armor

## Poison System (from DUNGEON.BAS lines 40000-40200)

### Classes That Can Use Poison

Only classes 3 (Thief), 6 (Assassin), and 10 (Alchemist) can use poison.

### Poison Types

12 poison types, stored in the same SP bitmask as spells (can own each type via bitmask).

### Applying Poison (line 40120)

```javascript
function applyPoison(player, poisonLevel) {
    // A5 = WP + I * (2 + 2*(CL=10))
    // Alchemist gets double poison effectiveness
    const multiplier = player.class === 10 ? 4 : 2;
    player.effectiveWeapon = player.weapon + poisonLevel * multiplier;
}
```

- **Thief/Assassin**: Weapon + (poisonLevel × 2)
- **Alchemist**: Weapon + (poisonLevel × 4)

### Poison Cap (line 40150)

Poison effectiveness caps at weapon + 2:

```javascript
// IF A5 > WP + 2 THEN A5 = WP + 2
if (player.effectiveWeapon > player.weapon + 2) {
    player.effectiveWeapon = player.weapon + 2;
    // "Your weapon has as much poison as it can hold. The rest just drips off."
}
```

### Poison Consumption (line 40140)

33% chance to consume poison vial on use:

```javascript
// RND(3) = 1 THEN SP = SP - 2^(I-1) = poison consumed
if (Math.floor(Math.random() * 3) === 0) {
    player.spells &= ~(1 << (poisonLevel - 1)); // Clear poison bit
    // "You toss the empty vial aside."
}
```

## Cleric Healing Cost (from DUNGEON.BAS line 10010)

```javascript
function getClericHealingCost(maxHP, currentHP, level, baseWeaponPrice) {
    // BW is a scaling factor (likely base weapon multiplier)
    // WP(1) is the base weapon price (Hands = 0, effectively making this formula 0 for low levels)
    const damage = maxHP - currentHP;
    const levelFactor = Math.pow(2, (level + 1) / (100 / BW));
    return Math.floor(damage * levelFactor * baseWeaponPrice * 250 / maxHP);
}
```

**Note:** This formula scales healing cost with:
- Amount of damage to heal
- Player level (exponential)
- Base weapon price (ties cost to economy)

## Notes

- File transfer functionality will NOT be ported (not relevant to web)
- The original BBS name "LOST GONZO" can be made configurable
- Access level system simplified to match web session model
- Modem-specific features (baud rate, nulls) displayed for nostalgia but non-functional
