# TPro BBS Port Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Port TPro BBS from Apple II AppleSoft BASIC to Express + EJS + SQLite, matching the Proving Grounds architecture.

**Architecture:** New `/tprobbs/` directory following the exact patterns from `/provinggrounds/`. Separate SQLite database. Shared terminal.css styling. Routes mounted under `/tprobbs` prefix in root server.js.

**Tech Stack:** Express 5, EJS, better-sqlite3, bcrypt, express-session. No new dependencies.

---

## Phase 1: Core Infrastructure

### Task 1: Create Directory Structure

**Files:**
- Create: `tprobbs/src/routes/index.js`
- Create: `tprobbs/src/routes/auth.js`
- Create: `tprobbs/src/db/schema.sql`
- Create: `tprobbs/src/db/seed.sql`
- Create: `tprobbs/src/db/init.js`
- Create: `tprobbs/src/middleware/auth.js`
- Create: `tprobbs/views/pages/login.ejs`
- Create: `tprobbs/views/pages/register.ejs`
- Create: `tprobbs/views/pages/main.ejs`
- Create: `tprobbs/views/pages/error.ejs`
- Create: `tprobbs/public/css/` (symlink or copy terminal.css)
- Create: `tprobbs/data/.gitkeep`
- Create: `tprobbs/package.json`
- Create: `tprobbs/CLAUDE.md`

**Step 1: Create all directories**

```bash
mkdir -p tprobbs/src/routes tprobbs/src/db tprobbs/src/middleware tprobbs/views/pages tprobbs/public/css tprobbs/data
```

**Step 2: Create package.json**

```json
{
  "name": "tprobbs",
  "version": "1.0.0",
  "description": "TPro BBS - Classic Apple II BBS Ported to Web",
  "main": "src/app.js",
  "scripts": {
    "db:init": "node src/db/init.js",
    "db:seed": "node src/db/seed.js"
  },
  "dependencies": {}
}
```

**Step 3: Create .gitkeep for data directory**

```bash
touch tprobbs/data/.gitkeep
```

**Step 4: Commit**

```bash
git add tprobbs/
git commit -m "feat(tprobbs): create directory structure for TPro BBS port"
```

---

### Task 2: Write Database Schema

**Files:**
- Create: `tprobbs/src/db/schema.sql`

**Step 1: Write the schema.sql file**

Write the complete schema including all tables from the design document:

```sql
-- TPro BBS Database Schema
-- Based on original Apple II data structures from CONFIG and BASIC sources

-- Users table (maps to TPro's USERS random-access file)
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
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
    -- Attributes (200 points distributed, each 20-80)
    stamina INTEGER DEFAULT 50,
    intellect INTEGER DEFAULT 50,
    agility INTEGER DEFAULT 50,
    charisma INTEGER DEFAULT 50,
    -- Combat stats
    hit_points INTEGER DEFAULT 15,
    max_hp INTEGER DEFAULT 15,
    spell_power INTEGER DEFAULT 0,
    max_sp INTEGER DEFAULT 0,
    -- Equipment (store indices, 1-based)
    weapon INTEGER DEFAULT 1,       -- Hands
    armor INTEGER DEFAULT 1,        -- Skin
    spells INTEGER DEFAULT 0,       -- Bitmask of owned spells
    home INTEGER DEFAULT 0,
    security INTEGER DEFAULT 0,
    -- Economy
    gold REAL DEFAULT 0,
    bank REAL DEFAULT 0,
    -- Gang membership
    gang_id INTEGER REFERENCES gangs(id),
    -- PvP/Joust stats
    joust_wins INTEGER DEFAULT 0,
    joust_losses INTEGER DEFAULT 0,
    kills INTEGER DEFAULT 0,
    killed INTEGER DEFAULT 0,
    -- Death tracking
    ko_timestamp INTEGER DEFAULT 0, -- day*2 + hour/12 when killed
    ko_killer_id INTEGER,           -- Who killed them
    -- Arena tracking
    arena_fights_today INTEGER DEFAULT 0,
    -- Daily tracking
    last_call_date TEXT,
    calls_today INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ko_killer_id) REFERENCES users(id)
);

-- Access levels (from CONFIG)
CREATE TABLE IF NOT EXISTS access_levels (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    level INTEGER NOT NULL,
    calls_per_day INTEGER NOT NULL,
    time_limit INTEGER NOT NULL
);

-- Character classes (11 classes from LOGON.BAS)
CREATE TABLE IF NOT EXISTS classes (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    spell_type TEXT,                -- 'spells', 'poisons', 'scrolls', or NULL
    can_backstab INTEGER DEFAULT 0,
    backstab_multiplier INTEGER DEFAULT 0,
    damage_bonus INTEGER DEFAULT 0,
    sp_on_create INTEGER DEFAULT 0  -- Gets SP at character creation
);

-- Weapons (55 items from CONFIG)
CREATE TABLE IF NOT EXISTS weapons (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    price REAL NOT NULL
);

-- Armor (28 items from CONFIG)
CREATE TABLE IF NOT EXISTS armor (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    price REAL NOT NULL
);

-- Homes (16 items from CONFIG)
CREATE TABLE IF NOT EXISTS homes (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    price REAL NOT NULL
);

-- Security items (16 items from CONFIG)
CREATE TABLE IF NOT EXISTS security (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    price REAL NOT NULL
);

-- Spells (12 spells from LOGON.BAS)
CREATE TABLE IF NOT EXISTS spells (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    price_multiplier REAL NOT NULL, -- Multiplied by weapon[1] price
    sp_cost INTEGER NOT NULL
);

-- Monsters (100 monsters from DUNGEON.BAS)
CREATE TABLE IF NOT EXISTS monsters (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    class INTEGER NOT NULL          -- Determines abilities
);

-- Gangs
CREATE TABLE IF NOT EXISTS gangs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    leader_id INTEGER REFERENCES users(id),
    gold REAL DEFAULT 0,
    active INTEGER DEFAULT 0,       -- 1 when all 4 members accepted
    member2_id INTEGER REFERENCES users(id),
    member3_id INTEGER REFERENCES users(id),
    member4_id INTEGER REFERENCES users(id),
    member2_accepted INTEGER DEFAULT 0,
    member3_accepted INTEGER DEFAULT 0,
    member4_accepted INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Message boards
CREATE TABLE IF NOT EXISTS boards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    access_level INTEGER DEFAULT 0
);

-- Board posts
CREATE TABLE IF NOT EXISTS posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    board_id INTEGER REFERENCES boards(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id),
    subject TEXT,
    body TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Private email
CREATE TABLE IF NOT EXISTS emails (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    from_id INTEGER REFERENCES users(id),
    to_id INTEGER REFERENCES users(id),
    subject TEXT,
    body TEXT,
    read INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Voting
CREATE TABLE IF NOT EXISTS votes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    question TEXT NOT NULL,
    active INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS vote_options (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    vote_id INTEGER REFERENCES votes(id) ON DELETE CASCADE,
    option_text TEXT NOT NULL,
    count INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS user_votes (
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    vote_id INTEGER REFERENCES votes(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, vote_id)
);

-- Arena top 20 leaderboard
CREATE TABLE IF NOT EXISTS arena_top (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    xp_earned REAL DEFAULT 0
);

-- Arena kill history (last 50)
CREATE TABLE IF NOT EXISTS arena_kills (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    killer_id INTEGER REFERENCES users(id),
    victim_id INTEGER REFERENCES users(id),
    killed_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Daily session tracking
CREATE TABLE IF NOT EXISTS sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER REFERENCES users(id),
    date TEXT,
    calls_today INTEGER DEFAULT 1
);

-- System configuration
CREATE TABLE IF NOT EXISTS config (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_posts_board_id ON posts(board_id);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_emails_to_id ON emails(to_id);
CREATE INDEX IF NOT EXISTS idx_emails_from_id ON emails(from_id);
CREATE INDEX IF NOT EXISTS idx_users_gang_id ON users(gang_id);
CREATE INDEX IF NOT EXISTS idx_users_level ON users(level DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_user_date ON sessions(user_id, date);
CREATE INDEX IF NOT EXISTS idx_arena_top_xp ON arena_top(xp_earned DESC);
CREATE INDEX IF NOT EXISTS idx_arena_kills_time ON arena_kills(killed_at DESC);
```

**Step 2: Verify schema has no syntax errors**

```bash
cd tprobbs && sqlite3 :memory: < src/db/schema.sql && echo "Schema OK"
```

Expected: `Schema OK`

**Step 3: Commit**

```bash
git add tprobbs/src/db/schema.sql
git commit -m "feat(tprobbs): add database schema"
```

---

### Task 3: Write Seed Data

**Files:**
- Create: `tprobbs/src/db/seed.sql`

**Step 1: Write seed.sql with all equipment, classes, monsters, and access levels**

```sql
-- TPro BBS Seed Data
-- From CONFIG and BASIC source analysis

-- Access Levels (11 levels from CONFIG)
INSERT INTO access_levels (id, name, level, calls_per_day, time_limit) VALUES
(0, 'Deceased', 0, 0, 0),
(1, 'Guest User', 1, 1, 10),
(2, 'New User', 2, 2, 15),
(3, 'Prisoner', 3, 1, 15),
(4, 'Probation', 4, 2, 20),
(5, 'Normal', 5, 5, 60),
(6, 'Elite User', 6, 6, 90),
(7, 'Contributor', 7, 7, 90),
(8, 'Visiting Sysop', 8, 8, 90),
(9, 'Co-Sysop', 9, 9, 240),
(10, 'Sysop', 10, 9, 1440);

-- Character Classes (11 classes from LOGON.BAS)
INSERT INTO classes (id, name, spell_type, can_backstab, backstab_multiplier, damage_bonus, sp_on_create) VALUES
(0, 'No class', NULL, 0, 0, 0, 0),
(1, 'Fighter', NULL, 0, 0, 1, 0),
(2, 'Magician', 'spells', 0, 0, 0, 1),
(3, 'Thief', 'poisons', 1, 3, 0, 0),
(4, 'Bard', 'scrolls', 1, 2, 1, 1),
(5, 'Cleric', 'spells', 0, 0, 1, 1),
(6, 'Assassin', 'poisons', 1, 2, 1, 0),
(7, 'Jester', 'spells', 1, 2, 0, 1),
(8, 'Barbarian', NULL, 0, 0, 2, 0),
(9, 'Sage', 'spells', 0, 0, 0, 1),
(10, 'Alchemist', 'poisons', 0, 0, 0, 0),
(11, 'Hero', 'spells', 1, 3, 1, 1);

-- Weapons (55 items from CONFIG)
INSERT INTO weapons (id, name, price) VALUES
(1, 'Hands', 0),
(2, 'Dart', 1),
(3, 'Sling', 2),
(4, 'Dagger', 5),
(5, 'Staff', 10),
(6, 'Club', 25),
(7, 'Hammer', 50),
(8, 'Mace', 100),
(9, 'Flail', 250),
(10, 'Spear', 500),
(11, 'Axe', 1000),
(12, 'Harpoon', 2500),
(13, 'Short Bow', 5000),
(14, 'War Hammer', 10000),
(15, 'Battle Axe', 25000),
(16, 'Light Crossbow', 50000),
(17, 'Javelin', 100000),
(18, 'Short Sword', 250000),
(19, 'Long Bow', 500000),
(20, 'Long Sword', 1000000),
(21, 'Heavy Crossbow', 2500000),
(22, 'Scimitar', 5000000),
(23, 'Pole Arm', 10000000),
(24, 'Broad Sword', 25000000),
(25, 'Trident', 50000000),
(26, 'Two-Handed Sword', 100000000),
(27, 'Gloves of Strength', 250000000),
(28, 'Dart of Homing', 500000000),
(29, 'Sling of Seeking', 1000000000),
(30, 'Dagger of Venom', 2500000000),
(31, 'Staff of Striking', 5000000000),
(32, 'Hammer of Throwing', 10000000000),
(33, 'Mace of Disruption', 25000000000),
(34, 'Axe of Hurling', 50000000000),
(35, 'Hammer of Thunderbolts', 100000000000),
(36, 'Axe of Lords', 250000000000),
(37, 'Crossbow of Distance', 500000000000),
(38, 'Sword of Quickness', 1000000000000),
(39, 'Arrows of Slaying', 2500000000000),
(40, 'Sword of Sharpness', 5000000000000),
(41, 'Crossbow of Accuracy', 10000000000000),
(42, 'Scimitar of Speed', 25000000000000),
(43, 'Sword of Wounding', 50000000000000),
(44, 'Trident of Submission', 100000000000000),
(45, 'Vorpal Sword', 250000000000000),
(46, 'Wand of Wonder', 500000000000000),
(47, 'Rod of Smiting', 1000000000000000),
(48, 'Sword of Life Stealing', 2500000000000000),
(49, 'Wand of Lightning', 5000000000000000),
(50, 'Ring of Shooting Stars', 10000000000000000),
(51, 'Staff of the Magi', 25000000000000000),
(52, 'S.K.U.D. Missle', 50000000000000000),
(53, 'Conventional Warhead Missle', 100000000000000000),
(54, 'Chemical Warhead Missle', 250000000000000000),
(55, 'Nuclear Warhead Missle', 500000000000000000);

-- Armor (28 items from CONFIG)
INSERT INTO armor (id, name, price) VALUES
(1, 'Skin', 0),
(2, 'Wooden Shield', 1),
(3, 'Small Shield', 5),
(4, 'Large Shield', 10),
(5, 'Leather', 50),
(6, 'Padded Leather', 100),
(7, 'Studded Leather', 500),
(8, 'Ring Mail', 1000),
(9, 'Scale Mail', 5000),
(10, 'Chain Mail', 10000),
(11, 'Splint Mail', 50000),
(12, 'Banded Mail', 100000),
(13, 'Bronze Plate Mail', 500000),
(14, 'Normal Plate Mail', 1000000),
(15, 'Field Plate Armor', 5000000),
(16, 'Full Plate Armor', 10000000),
(17, 'Dancing Shield', 50000000),
(18, 'Dragon Scale Mail', 100000000),
(19, 'Elfin Chain Mail', 500000000),
(20, 'Minthral Plate Armor', 1000000000),
(21, 'Cloak of Elvenkind', 5000000000),
(22, 'Robe of Blending', 10000000000),
(23, 'Adamantite Plate Mail', 50000000000),
(24, 'Cloak of Displacement', 100000000000),
(25, 'Cube of Force', 500000000000),
(26, 'Ring of Invisibility', 1000000000000),
(27, 'Patriot Missles', 5000000000000),
(28, 'Nuclear Proof Bunker', 10000000000000);

-- Homes (16 items from CONFIG)
INSERT INTO homes (id, name, price) VALUES
(0, 'Alley', 0),
(1, 'Cardboard box', 100),
(2, 'Cave', 1000),
(3, 'Stable', 10000),
(4, 'Shed', 100000),
(5, 'Shack', 1000000),
(6, 'Barn', 10000000),
(7, 'Cabin', 100000000),
(8, 'Room above tavern', 1000000000),
(9, 'Apartment', 10000000000),
(10, 'House', 100000000000),
(11, 'Tower', 1000000000000),
(12, 'Mansion', 10000000000000),
(13, 'Castle', 100000000000000),
(14, 'Palace', 1000000000000000),
(15, 'Fortress', 10000000000000000);

-- Security items (16 items from CONFIG)
INSERT INTO security (id, name, price) VALUES
(0, 'Whisky bottle', 0),
(1, 'Baseball bat', 100),
(2, 'Padlock', 1000),
(3, 'Dead bolt lock', 10000),
(4, 'Trip-wire trap', 100000),
(5, 'Dog', 1000000),
(6, 'Fence', 10000000),
(7, 'Barbed wire fence', 100000000),
(8, 'Brick wall', 1000000000),
(9, 'Shotgun', 10000000000),
(10, 'Burglar alarm', 100000000000),
(11, 'Security guard', 1000000000000),
(12, 'Guard tower', 10000000000000),
(13, 'Moat', 100000000000000),
(14, 'Troops', 1000000000000000),
(15, 'Magical barrier', 10000000000000000);

-- Spells (12 spells from LOGON.BAS)
INSERT INTO spells (id, name, price_multiplier, sp_cost) VALUES
(1, 'Charm', 10, 10),
(2, 'Intuition', 100, 25),
(3, 'Strength', 1000, 50),
(4, 'Accuracy', 10000, 75),
(5, 'Shield', 100000, 100),
(6, 'Hone', 1000000, 250),
(7, 'Teleport', 10000000, 500),
(8, 'Heal', 100000000, 750),
(9, 'Blast', 1000000000, 1000),
(10, 'Resurrect', 10000000000, 2500),
(11, 'Cure', 100000000000, 5000),
(12, 'Disintegrate', 1000000000000, 7500);

-- Monsters (100 monsters from DUNGEON.BAS lines 59000-59100)
INSERT INTO monsters (id, name, class) VALUES
(1, 'goblin', 1),
(2, 'orc', 1),
(3, 'kobold', 1),
(4, 'hobgoblin', 1),
(5, 'bullywug', 1),
(6, 'xvart', 1),
(7, 'caveman', 1),
(8, 'norker', 1),
(9, 'skeleton', 1),
(10, 'zombie', 1),
(11, 'giant centipede', 1),
(12, 'gnoll', 1),
(13, 'stirge', 1),
(14, 'troglodyte', 1),
(15, 'lizard man', 1),
(16, 'crabman', 1),
(17, 'mongrelman', 1),
(18, 'ogrillon', 8),
(19, 'githzerai', 5),
(20, 'kuo-toa', 5),
(21, 'bugbear', 8),
(22, 'ghoul', 4),
(23, 'ogre', 8),
(24, 'firedrake', 4),
(25, 'drow', 4),
(26, 'firenewt', 4),
(27, 'harpy', 1),
(28, 'ophidian', 1),
(29, 'phantom', 4),
(30, 'worg', 1),
(31, 'gargoyle', 4),
(32, 'rust monster', 1),
(33, 'ghast', 4),
(34, 'werewolf', 4),
(35, 'owlbear', 1),
(36, 'firetoad', 4),
(37, 'hall hound', 4),
(38, 'hook horror', 1),
(39, 'anhkheg', 8),
(40, 'githyanki', 5),
(41, 'cave bear', 8),
(42, 'cockatrice', 4),
(43, 'minotaur', 8),
(44, 'displacer beast', 1),
(45, 'doppleganger', 0),
(46, 'imp', 4),
(47, 'quasit', 4),
(48, 'ice lizard', 1),
(49, 'svirfneblin', 1),
(50, 'yeti', 1),
(51, 'carrion crawler', 1),
(52, 'manticore', 1),
(53, 'troll', 4),
(54, 'wight', 4),
(55, 'wraith', 4),
(56, 'basilisk', 1),
(57, 'wyvern', 8),
(58, 'medusa', 4),
(59, 'drider', 1),
(60, 'ogre mage', 4),
(61, 'hill giant', 8),
(62, 'tunnel worm', 1),
(63, 'hydra', 8),
(64, 'mimic', 1),
(65, 'succubus', 5),
(66, 'mind flayer', 5),
(67, 'mummy', 4),
(68, 'neo-otyugh', 8),
(69, 'roper', 1),
(70, 'umber hulk', 8),
(71, 'pyrohydra', 8),
(72, 'will-o-wisp', 4),
(73, 'vampire', 5),
(74, 'ghost', 4),
(75, 'dracolisk', 5),
(76, 'naga', 4),
(77, 'xag-ya', 4),
(78, 'xeg-yi', 4),
(79, 'minor demon', 4),
(80, 'green dragon', 5),
(81, 'red dragon', 5),
(82, 'stone golem', 8),
(83, 'nycadaemon', 5),
(84, 'titan', 8),
(85, 'demilich', 9),
(86, 'pit fiend', 5),
(87, 'lernaean hydra', 8),
(88, 'major demon', 5),
(89, 'mist dragon', 5),
(90, 'grey slaad', 4),
(91, 'beholder', 5),
(92, 'iron golem', 8),
(93, 'death slaad', 4),
(94, 'cloud dragon', 5),
(95, 'lich', 9),
(96, 'elder titan', 8),
(97, 'slaad lord', 5),
(98, 'demon prince', 5),
(99, 'arch devil', 5),
(100, 'elemental prince', 5);

-- Default message boards
INSERT INTO boards (id, name, access_level) VALUES
(1, 'General Discussion', 0),
(2, 'Trading Post', 0),
(3, 'Combat Reports', 0),
(4, 'Gang Recruiting', 0),
(5, 'Sysop Announcements', 0);

-- Default config
INSERT INTO config (key, value) VALUES
('bbs_name', 'Lost Gonzo BBS'),
('sysop_name', 'Sysop'),
('version', '1.0.0');
```

**Step 2: Verify seed data is valid SQL**

```bash
cd tprobbs && sqlite3 :memory: < src/db/schema.sql && sqlite3 :memory: ".read src/db/schema.sql" ".read src/db/seed.sql" "SELECT COUNT(*) FROM weapons;" && echo "Seed OK"
```

Expected: `55` followed by `Seed OK`

**Step 3: Commit**

```bash
git add tprobbs/src/db/seed.sql
git commit -m "feat(tprobbs): add seed data for equipment, classes, monsters"
```

---

### Task 4: Write Database Initialization Script

**Files:**
- Create: `tprobbs/src/db/init.js`

**Step 1: Write the init.js file**

```javascript
/**
 * TPro BBS Database Initialization
 * Creates and seeds the database
 */

const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const DB_PATH = process.env.TPROBBS_DATABASE_PATH || path.join(__dirname, '../../data/tprobbs.db');
const dbDir = path.dirname(DB_PATH);

// Create data directory if needed
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

// Remove existing database
if (fs.existsSync(DB_PATH)) {
    fs.unlinkSync(DB_PATH);
    console.log('Removed existing database');
}

// Create new database
const db = new Database(DB_PATH);
db.pragma('foreign_keys = ON');

// Read and execute schema
const schemaPath = path.join(__dirname, 'schema.sql');
const schema = fs.readFileSync(schemaPath, 'utf8');
db.exec(schema);
console.log('Schema created');

// Read and execute seed data
const seedPath = path.join(__dirname, 'seed.sql');
const seed = fs.readFileSync(seedPath, 'utf8');
db.exec(seed);
console.log('Seed data inserted');

// Verify
const weaponCount = db.prepare('SELECT COUNT(*) as count FROM weapons').get();
const monsterCount = db.prepare('SELECT COUNT(*) as count FROM monsters').get();
const classCount = db.prepare('SELECT COUNT(*) as count FROM classes').get();

console.log(`
TPro BBS Database Initialized
=============================
Weapons: ${weaponCount.count}
Monsters: ${monsterCount.count}
Classes: ${classCount.count}
Database: ${DB_PATH}
`);

db.close();
```

**Step 2: Run the init script to verify it works**

```bash
cd tprobbs && node src/db/init.js
```

Expected output showing counts and "Database Initialized"

**Step 3: Commit**

```bash
git add tprobbs/src/db/init.js
git commit -m "feat(tprobbs): add database initialization script"
```

---

### Task 5: Write Auth Middleware

**Files:**
- Create: `tprobbs/src/middleware/auth.js`

**Step 1: Write the auth middleware**

```javascript
/**
 * TPro BBS Authentication Middleware
 */

function requireAuth(req, res, next) {
    if (!req.session.tproUserId) {
        return res.redirect('/tprobbs/');
    }
    next();
}

function loadUser(db) {
    return (req, res, next) => {
        if (!req.session.tproUserId) {
            return next();
        }

        const user = db.prepare(`
            SELECT u.*, c.name as class_name, al.name as access_name,
                   w.name as weapon_name, w.price as weapon_price,
                   a.name as armor_name, a.price as armor_price,
                   h.name as home_name, s.name as security_name
            FROM users u
            LEFT JOIN classes c ON u.class = c.id
            LEFT JOIN access_levels al ON u.access_level = al.id
            LEFT JOIN weapons w ON u.weapon = w.id
            LEFT JOIN armor a ON u.armor = a.id
            LEFT JOIN homes h ON u.home = h.id
            LEFT JOIN security s ON u.security = s.id
            WHERE u.id = ?
        `).get(req.session.tproUserId);

        if (!user) {
            req.session.tproUserId = null;
            return res.redirect('/tprobbs/');
        }

        // Calculate time remaining (from access level)
        const accessLevel = db.prepare('SELECT * FROM access_levels WHERE id = ?')
            .get(user.access_level);
        const loginTime = req.session.tproLoginTime || Date.now();
        const elapsed = Math.floor((Date.now() - loginTime) / 60000);
        const timeRemaining = Math.max(0, (accessLevel?.time_limit || 60) - elapsed);

        req.user = {
            ...user,
            timeRemaining
        };
        res.locals.user = req.user;
        next();
    };
}

module.exports = { requireAuth, loadUser };
```

**Step 2: Commit**

```bash
git add tprobbs/src/middleware/auth.js
git commit -m "feat(tprobbs): add authentication middleware"
```

---

### Task 6: Write Auth Routes

**Files:**
- Create: `tprobbs/src/routes/auth.js`

**Step 1: Write the auth routes**

```javascript
/**
 * TPro BBS Authentication Routes
 */

const express = require('express');
const bcrypt = require('bcrypt');
const router = express.Router();

// Login page
router.get('/', (req, res) => {
    if (req.session.tproUserId) {
        return res.redirect('/tprobbs/main');
    }
    res.render('pages/login', {
        title: 'Lost Gonzo BBS',
        error: null,
        success: null
    });
});

// Login handler
router.post('/login', async (req, res) => {
    const { username, password } = req.body;
    const db = req.app.get('tprodb');

    try {
        const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);

        if (!user) {
            return res.render('pages/login', {
                title: 'Lost Gonzo BBS',
                error: 'User not found. Register as a new user?',
                success: null
            });
        }

        const validPassword = await bcrypt.compare(password, user.password_hash);
        if (!validPassword) {
            return res.render('pages/login', {
                title: 'Lost Gonzo BBS',
                error: 'Invalid password!',
                success: null
            });
        }

        // Check daily call limit
        const today = new Date().toISOString().split('T')[0];
        const accessLevel = db.prepare('SELECT * FROM access_levels WHERE id = ?')
            .get(user.access_level);

        if (user.last_call_date !== today) {
            // New day, reset
            db.prepare('UPDATE users SET calls_today = 0, arena_fights_today = 0 WHERE id = ?')
                .run(user.id);
        } else if (user.calls_today >= accessLevel.calls_per_day) {
            return res.render('pages/login', {
                title: 'Lost Gonzo BBS',
                error: `You have used all ${accessLevel.calls_per_day} calls for today.`,
                success: null
            });
        }

        // Update login info
        db.prepare(`
            UPDATE users
            SET last_on = CURRENT_TIMESTAMP,
                calls_today = calls_today + 1,
                calls = calls + 1,
                last_call_date = ?
            WHERE id = ?
        `).run(today, user.id);

        // Set session
        req.session.tproUserId = user.id;
        req.session.tproUsername = user.username;
        req.session.tproLoginTime = Date.now();

        res.redirect('/tprobbs/main');
    } catch (err) {
        console.error('Login error:', err);
        res.render('pages/login', {
            title: 'Lost Gonzo BBS',
            error: 'An error occurred. Please try again.',
            success: null
        });
    }
});

// Registration page
router.get('/register', (req, res) => {
    const db = req.app.get('tprodb');
    const classes = db.prepare('SELECT * FROM classes WHERE id > 0').all();

    res.render('pages/register', {
        title: 'New User Registration',
        error: null,
        classes
    });
});

// Registration handler
router.post('/register', async (req, res) => {
    const { username, password, classId, stamina, intellect, agility, charisma } = req.body;
    const db = req.app.get('tprodb');

    const renderError = (error) => {
        const classes = db.prepare('SELECT * FROM classes WHERE id > 0').all();
        return res.render('pages/register', {
            title: 'New User Registration',
            error,
            classes
        });
    };

    try {
        // Validate username
        if (!username || username.length < 3 || username.length > 25) {
            return renderError('Username must be 3-25 characters.');
        }
        if (!/^[a-zA-Z0-9_]+$/.test(username)) {
            return renderError('Username can only contain letters, numbers, and underscores.');
        }

        // Validate password
        if (!password || password.length < 6) {
            return renderError('Password must be at least 6 characters.');
        }

        // Check if username exists
        const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
        if (existing) {
            return renderError('Username already exists!');
        }

        // Validate stats (200 points, each 20-80)
        const stats = {
            stamina: parseInt(stamina, 10) || 50,
            intellect: parseInt(intellect, 10) || 50,
            agility: parseInt(agility, 10) || 50,
            charisma: parseInt(charisma, 10) || 50
        };

        const total = stats.stamina + stats.intellect + stats.agility + stats.charisma;
        if (total !== 200) {
            return renderError(`Stats must total exactly 200. You have ${total}.`);
        }

        for (const [stat, value] of Object.entries(stats)) {
            if (value < 20 || value > 80) {
                return renderError(`${stat} must be between 20 and 80.`);
            }
        }

        // Validate class
        const playerClass = parseInt(classId, 10) || 1;
        const classData = db.prepare('SELECT * FROM classes WHERE id = ?').get(playerClass);
        if (!classData) {
            return renderError('Invalid class selection.');
        }

        // Hash password
        const passwordHash = await bcrypt.hash(password, 10);

        // Calculate starting SP (15 if spell-casting class)
        const startingSP = classData.sp_on_create ? 15 : 0;

        // Create user
        db.prepare(`
            INSERT INTO users (
                username, password_hash, class,
                stamina, intellect, agility, charisma,
                hit_points, max_hp, spell_power, max_sp,
                weapon, armor, gold
            ) VALUES (?, ?, ?, ?, ?, ?, ?, 15, 15, ?, ?, 1, 1, 0)
        `).run(
            username, passwordHash, playerClass,
            stats.stamina, stats.intellect, stats.agility, stats.charisma,
            startingSP, startingSP
        );

        res.render('pages/login', {
            title: 'Lost Gonzo BBS',
            error: null,
            success: 'Registration successful! You may now login.'
        });
    } catch (err) {
        console.error('Registration error:', err);
        return renderError('Registration failed. Please try again.');
    }
});

// Logout
router.get('/logout', (req, res) => {
    req.session.tproUserId = null;
    req.session.tproUsername = null;
    req.session.tproLoginTime = null;
    res.redirect('/tprobbs/');
});

module.exports = router;
```

**Step 2: Commit**

```bash
git add tprobbs/src/routes/auth.js
git commit -m "feat(tprobbs): add authentication routes (login, register, logout)"
```

---

### Task 7: Write Main Routes

**Files:**
- Create: `tprobbs/src/routes/main.js`

**Step 1: Write the main routes**

```javascript
/**
 * TPro BBS Main Menu Routes
 */

const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');

// Main menu
router.get('/', requireAuth, (req, res) => {
    const db = req.app.get('tprodb');

    // Count unread emails
    const unreadMail = db.prepare(
        'SELECT COUNT(*) as count FROM emails WHERE to_id = ? AND read = 0'
    ).get(req.user.id).count;

    res.render('pages/main', {
        title: 'Main Menu',
        user: req.user,
        unreadMail
    });
});

// User settings
router.get('/settings', requireAuth, (req, res) => {
    res.render('pages/settings', {
        title: 'User Settings',
        user: req.user
    });
});

// Members list
router.get('/members', requireAuth, (req, res) => {
    const db = req.app.get('tprodb');
    const page = parseInt(req.query.page, 10) || 1;
    const limit = 25;
    const offset = (page - 1) * limit;

    const total = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
    const members = db.prepare(`
        SELECT u.id, u.username, u.level, u.class, c.name as class_name,
               u.status, u.kills, u.killed, u.last_on
        FROM users u
        LEFT JOIN classes c ON u.class = c.id
        ORDER BY u.level DESC, u.experience DESC
        LIMIT ? OFFSET ?
    `).all(limit, offset);

    res.render('pages/members', {
        title: 'Members List',
        user: req.user,
        members,
        page,
        totalPages: Math.ceil(total / limit)
    });
});

module.exports = router;
```

**Step 2: Commit**

```bash
git add tprobbs/src/routes/main.js
git commit -m "feat(tprobbs): add main menu routes"
```

---

### Task 8: Write Route Index

**Files:**
- Create: `tprobbs/src/routes/index.js`

**Step 1: Write the route aggregator**

```javascript
/**
 * TPro BBS Route Aggregator
 */

const express = require('express');
const router = express.Router();

const authRoutes = require('./auth');
const mainRoutes = require('./main');

// Auth routes at root level
router.use('/', authRoutes);

// Main menu routes
router.use('/main', mainRoutes);

module.exports = router;
```

**Step 2: Commit**

```bash
git add tprobbs/src/routes/index.js
git commit -m "feat(tprobbs): add route index aggregator"
```

---

### Task 9: Write EJS Templates

**Files:**
- Create: `tprobbs/views/pages/login.ejs`
- Create: `tprobbs/views/pages/register.ejs`
- Create: `tprobbs/views/pages/main.ejs`
- Create: `tprobbs/views/pages/error.ejs`
- Create: `tprobbs/views/pages/settings.ejs`
- Create: `tprobbs/views/pages/members.ejs`

**Step 1: Write login.ejs**

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><%= title %></title>
    <link rel="stylesheet" href="/provinggrounds/css/terminal.css">
</head>
<body>
    <div class="terminal">
        <div class="ascii-box">
<pre>
═══════════════════════════════════════════════════════
                    LOST GONZO BBS
                  TPro BBS Recreation
═══════════════════════════════════════════════════════
</pre>
        </div>

        <% if (error) { %>
        <div class="message message-error">
            <%= error %>
        </div>
        <% } %>

        <% if (success) { %>
        <div class="message message-success">
            <%= success %>
        </div>
        <% } %>

        <h2>Login</h2>

        <form action="/tprobbs/login" method="POST">
            <div class="form-group">
                <label for="username">Username:</label>
                <input type="text" id="username" name="username" required autofocus>
            </div>
            <div class="form-group">
                <label for="password">Password:</label>
                <input type="password" id="password" name="password" required>
            </div>
            <div class="form-group">
                <button type="submit">Login</button>
            </div>
        </form>

        <div class="menu">
            <div class="menu-item">
                <span class="menu-key">N)</span>
                <a href="/tprobbs/register">New User Registration</a>
            </div>
            <div class="menu-item">
                <span class="menu-key">B)</span>
                <a href="/">Back to Main Site</a>
            </div>
        </div>
    </div>
</body>
</html>
```

**Step 2: Write register.ejs**

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><%= title %></title>
    <link rel="stylesheet" href="/provinggrounds/css/terminal.css">
</head>
<body>
    <div class="terminal">
        <div class="ascii-box">
<pre>
═══════════════════════════════════════════════════════
                    LOST GONZO BBS
                 New User Registration
═══════════════════════════════════════════════════════
</pre>
        </div>

        <% if (error) { %>
        <div class="message message-error">
            <%= error %>
        </div>
        <% } %>

        <form action="/tprobbs/register" method="POST">
            <div class="form-group">
                <label for="username">Username (3-25 chars, letters/numbers/_):</label>
                <input type="text" id="username" name="username" required minlength="3" maxlength="25" pattern="[a-zA-Z0-9_]+">
            </div>
            <div class="form-group">
                <label for="password">Password (min 6 chars):</label>
                <input type="password" id="password" name="password" required minlength="6">
            </div>
            <div class="form-group">
                <label for="classId">Character Class:</label>
                <select id="classId" name="classId" required>
                    <% classes.forEach(c => { %>
                    <option value="<%= c.id %>"><%= c.name %></option>
                    <% }) %>
                </select>
            </div>

            <h2>Distribute 200 Points (each stat 20-80)</h2>

            <div class="stats">
                <div class="stat">
                    <label for="stamina">Stamina:</label>
                    <input type="number" id="stamina" name="stamina" value="50" min="20" max="80" required>
                </div>
                <div class="stat">
                    <label for="intellect">Intellect:</label>
                    <input type="number" id="intellect" name="intellect" value="50" min="20" max="80" required>
                </div>
                <div class="stat">
                    <label for="agility">Agility:</label>
                    <input type="number" id="agility" name="agility" value="50" min="20" max="80" required>
                </div>
                <div class="stat">
                    <label for="charisma">Charisma:</label>
                    <input type="number" id="charisma" name="charisma" value="50" min="20" max="80" required>
                </div>
            </div>

            <p id="statTotal">Total: 200</p>

            <div class="form-group">
                <button type="submit">Create Character</button>
            </div>
        </form>

        <div class="menu">
            <div class="menu-item">
                <span class="menu-key">B)</span>
                <a href="/tprobbs/">Back to Login</a>
            </div>
        </div>
    </div>

    <script>
        const inputs = ['stamina', 'intellect', 'agility', 'charisma'];
        const totalEl = document.getElementById('statTotal');

        function updateTotal() {
            let total = 0;
            inputs.forEach(id => {
                total += parseInt(document.getElementById(id).value, 10) || 0;
            });
            totalEl.textContent = `Total: ${total}`;
            totalEl.style.color = total === 200 ? '#00ff00' : '#ff0000';
        }

        inputs.forEach(id => {
            document.getElementById(id).addEventListener('input', updateTotal);
        });
    </script>
</body>
</html>
```

**Step 3: Write main.ejs**

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Main Menu - Lost Gonzo BBS</title>
    <link rel="stylesheet" href="/provinggrounds/css/terminal.css">
</head>
<body>
    <div class="terminal">
        <div class="ascii-box">
<pre>
═══════════════════════════════════════════════════════
                    LOST GONZO BBS
                      Main Menu
═══════════════════════════════════════════════════════
</pre>
        </div>

        <div class="stats">
            <div class="stat">
                <span class="stat-label">Character:</span>
                <span class="stat-value"><%= user.username %></span>
            </div>
            <div class="stat">
                <span class="stat-label">Class:</span>
                <span class="stat-value"><%= user.class_name || 'No class' %></span>
            </div>
            <div class="stat">
                <span class="stat-label">Level:</span>
                <span class="stat-value"><%= user.level %></span>
            </div>
            <div class="stat">
                <span class="stat-label">Gold:</span>
                <span class="stat-value"><%= Math.floor(user.gold).toLocaleString() %></span>
            </div>
            <div class="stat">
                <span class="stat-label">HP:</span>
                <span class="stat-value"><%= user.hit_points %>/<%= user.max_hp %></span>
            </div>
            <div class="stat">
                <span class="stat-label">SP:</span>
                <span class="stat-value"><%= user.spell_power %>/<%= user.max_sp %></span>
            </div>
            <div class="stat">
                <span class="stat-label">Time Left:</span>
                <span class="stat-value"><%= user.timeRemaining %> minutes</span>
            </div>
            <div class="stat">
                <span class="stat-label">Status:</span>
                <span class="stat-value"><%= user.status ? 'Alive' : 'Dead' %></span>
            </div>
        </div>

        <% if (unreadMail > 0) { %>
        <div class="message message-warning">
            You have <%= unreadMail %> unread message(s)!
        </div>
        <% } %>

        <h2>Commands</h2>

        <div class="menu">
            <div class="menu-item">
                <span class="menu-key">B)</span>
                <a href="/tprobbs/boards" data-key="b">Message Boards</a>
            </div>
            <div class="menu-item">
                <span class="menu-key">E)</span>
                <a href="/tprobbs/email" data-key="e">Electronic Mail</a>
            </div>
            <div class="menu-item">
                <span class="menu-key">G)</span>
                <a href="/tprobbs/games" data-key="g">Game Section</a>
            </div>
            <div class="menu-item">
                <span class="menu-key">I)</span>
                <a href="/tprobbs/main/info" data-key="i">Information Section</a>
            </div>
            <div class="menu-item">
                <span class="menu-key">M)</span>
                <a href="/tprobbs/main/members" data-key="m">Members List</a>
            </div>
            <div class="menu-item">
                <span class="menu-key">S)</span>
                <a href="/tprobbs/main/settings" data-key="s">Settings</a>
            </div>
            <div class="menu-item">
                <span class="menu-key">V)</span>
                <a href="/tprobbs/main/vote" data-key="v">Voting Booth</a>
            </div>
            <div class="menu-item">
                <span class="menu-key">Q)</span>
                <a href="/tprobbs/logout" data-key="q">Quit / Logoff</a>
            </div>
        </div>

        <div class="status-bar">
            <span>[<%= user.username %>]</span>
            <span>Level: <%= user.level %></span>
            <span>Gold: <%= Math.floor(user.gold).toLocaleString() %></span>
            <span>HP: <%= user.hit_points %>/<%= user.max_hp %></span>
            <span>Time: <%= user.timeRemaining %>m</span>
        </div>
    </div>

    <script>
        document.addEventListener('keydown', (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
            const link = document.querySelector(`a[data-key="${e.key.toLowerCase()}"]`);
            if (link) {
                e.preventDefault();
                window.location.href = link.href;
            }
        });
    </script>
</body>
</html>
```

**Step 4: Write error.ejs**

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Error - Lost Gonzo BBS</title>
    <link rel="stylesheet" href="/provinggrounds/css/terminal.css">
</head>
<body>
    <div class="terminal">
        <div class="ascii-box">
<pre>
═══════════════════════════════════════════════════════
                    LOST GONZO BBS
                       ERROR
═══════════════════════════════════════════════════════
</pre>
        </div>

        <div class="message message-error">
            <h2>Error <%= status %></h2>
            <p><%= message %></p>
        </div>

        <div class="menu">
            <div class="menu-item">
                <span class="menu-key">B)</span>
                <a href="/tprobbs/">Back to Login</a>
            </div>
            <div class="menu-item">
                <span class="menu-key">M)</span>
                <a href="/tprobbs/main">Main Menu</a>
            </div>
        </div>
    </div>
</body>
</html>
```

**Step 5: Write settings.ejs**

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Settings - Lost Gonzo BBS</title>
    <link rel="stylesheet" href="/provinggrounds/css/terminal.css">
</head>
<body>
    <div class="terminal">
        <div class="ascii-box">
<pre>
═══════════════════════════════════════════════════════
                    LOST GONZO BBS
                    User Settings
═══════════════════════════════════════════════════════
</pre>
        </div>

        <div class="stats">
            <div class="stat">
                <span class="stat-label">Username:</span>
                <span class="stat-value"><%= user.username %></span>
            </div>
            <div class="stat">
                <span class="stat-label">Access Level:</span>
                <span class="stat-value"><%= user.access_name %></span>
            </div>
            <div class="stat">
                <span class="stat-label">Total Calls:</span>
                <span class="stat-value"><%= user.calls %></span>
            </div>
            <div class="stat">
                <span class="stat-label">Member Since:</span>
                <span class="stat-value"><%= user.created_at %></span>
            </div>
        </div>

        <div class="menu">
            <div class="menu-item">
                <span class="menu-key">B)</span>
                <a href="/tprobbs/main">Back to Main Menu</a>
            </div>
        </div>

        <div class="status-bar">
            <span>[<%= user.username %>]</span>
            <span>Level: <%= user.level %></span>
            <span>Gold: <%= Math.floor(user.gold).toLocaleString() %></span>
            <span>HP: <%= user.hit_points %>/<%= user.max_hp %></span>
            <span>Time: <%= user.timeRemaining %>m</span>
        </div>
    </div>
</body>
</html>
```

**Step 6: Write members.ejs**

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Members - Lost Gonzo BBS</title>
    <link rel="stylesheet" href="/provinggrounds/css/terminal.css">
</head>
<body>
    <div class="terminal">
        <div class="ascii-box">
<pre>
═══════════════════════════════════════════════════════
                    LOST GONZO BBS
                    Members List
═══════════════════════════════════════════════════════
</pre>
        </div>

        <table>
            <thead>
                <tr>
                    <th>Name</th>
                    <th>Level</th>
                    <th>Class</th>
                    <th>Status</th>
                    <th>Kills</th>
                </tr>
            </thead>
            <tbody>
                <% members.forEach(m => { %>
                <tr>
                    <td><%= m.username %></td>
                    <td><%= m.level %></td>
                    <td><%= m.class_name || 'None' %></td>
                    <td><%= m.status ? 'Alive' : 'Dead' %></td>
                    <td><%= m.kills %></td>
                </tr>
                <% }) %>
            </tbody>
        </table>

        <% if (totalPages > 1) { %>
        <div class="pagination">
            <% for (let i = 1; i <= totalPages; i++) { %>
            <a href="/tprobbs/main/members?page=<%= i %>" class="<%= i === page ? 'active' : '' %>"><%= i %></a>
            <% } %>
        </div>
        <% } %>

        <div class="menu">
            <div class="menu-item">
                <span class="menu-key">B)</span>
                <a href="/tprobbs/main">Back to Main Menu</a>
            </div>
        </div>

        <div class="status-bar">
            <span>[<%= user.username %>]</span>
            <span>Level: <%= user.level %></span>
            <span>Gold: <%= Math.floor(user.gold).toLocaleString() %></span>
            <span>HP: <%= user.hit_points %>/<%= user.max_hp %></span>
            <span>Time: <%= user.timeRemaining %>m</span>
        </div>
    </div>
</body>
</html>
```

**Step 7: Commit all templates**

```bash
git add tprobbs/views/
git commit -m "feat(tprobbs): add EJS templates (login, register, main, error, settings, members)"
```

---

### Task 10: Integrate with Root Server

**Files:**
- Modify: `server.js:236-275` (add TPro BBS routes after Proving Grounds)

**Step 1: Read current server.js to find exact insertion point**

The TPro BBS routes should be added after line 275 (after Proving Grounds routes).

**Step 2: Add TPro BBS integration to server.js**

Add after the Proving Grounds routes section (around line 275):

```javascript
// -----------------------------
// TPro BBS - Express App
// -----------------------------

// Database connection for TPro BBS
const TPRO_DB_PATH = process.env.TPROBBS_DATABASE_PATH ||
    (process.env.NODE_ENV === 'production' ? '/data/tprobbs.db' : './tprobbs/data/tprobbs.db');
let tprodb;

// Auto-initialize TPro BBS database if it doesn't exist
const tproDbDir = path.dirname(TPRO_DB_PATH);
if (!fs.existsSync(tproDbDir)) {
    fs.mkdirSync(tproDbDir, { recursive: true });
}

try {
    const tproDbExists = fs.existsSync(TPRO_DB_PATH);
    tprodb = new Database(TPRO_DB_PATH);
    tprodb.pragma('foreign_keys = ON');

    if (!tproDbExists) {
        console.log('Initializing TPro BBS database...');
        const tproSchemaPath = path.join(__dirname, 'tprobbs/src/db/schema.sql');
        const tproSchema = fs.readFileSync(tproSchemaPath, 'utf8');
        tprodb.exec(tproSchema);

        const tproSeedPath = path.join(__dirname, 'tprobbs/src/db/seed.sql');
        const tproSeed = fs.readFileSync(tproSeedPath, 'utf8');
        tprodb.exec(tproSeed);
        console.log('TPro BBS database initialized.');
    }

    app.set('tprodb', tprodb);
} catch (err) {
    console.error('TPro BBS database error:', err.message);
}

// Mount TPro BBS routes with /tprobbs prefix
if (tprodb) {
    const { loadUser } = require('./tprobbs/src/middleware/auth');

    // Override render for tprobbs routes
    app.use('/tprobbs', (req, res, next) => {
        const originalRender = res.render.bind(res);
        res.render = (view, options) => {
            originalRender(view, {
                ...options,
                settings: {
                    ...req.app.settings,
                    views: path.join(__dirname, 'tprobbs/views')
                }
            });
        };
        req.app.set('views', path.join(__dirname, 'tprobbs/views'));
        next();
    });

    // Load user middleware
    app.use('/tprobbs', loadUser(tprodb));

    // Mount routes
    const tproBbsRoutes = require('./tprobbs/src/routes/index');
    app.use('/tprobbs', tproBbsRoutes);
}
```

**Step 3: Update the startup banner to include TPro BBS**

Find the startup console.log banner and add:

```javascript
║   - TPro BBS       → /tprobbs/                              ║
```

**Step 4: Update graceful shutdown to close tprodb**

Find the SIGINT handler and update:

```javascript
process.on('SIGINT', () => {
    console.log('\nShutting down...');
    if (db) db.close();
    if (tprodb) tprodb.close();
    process.exit(0);
});
```

**Step 5: Test the integration**

```bash
npm run dev
```

Then visit http://localhost:3000/tprobbs/ in a browser.

**Step 6: Commit**

```bash
git add server.js
git commit -m "feat(tprobbs): integrate TPro BBS routes into root server"
```

---

### Task 11: Write CLAUDE.md for TPro BBS

**Files:**
- Create: `tprobbs/CLAUDE.md`

**Step 1: Write the CLAUDE.md**

```markdown
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
```

**Step 2: Commit**

```bash
git add tprobbs/CLAUDE.md
git commit -m "docs(tprobbs): add CLAUDE.md with architecture guidance"
```

---

## Phase 1 Complete Checkpoint

At this point, Phase 1 (Core Infrastructure) is complete. The following should work:

1. Database schema and seed data
2. User registration with stat distribution
3. User login with call limit checking
4. Main menu display with user stats
5. Members list with pagination
6. User settings page
7. Logout

**Test the implementation:**

```bash
npm run dev
# Visit http://localhost:3000/tprobbs/
# Register a new user
# Login
# Navigate the main menu
```

---

## Phase 2: Communication (Boards & Email)

### Task 12: Write Boards Routes

**Files:**
- Create: `tprobbs/src/routes/boards.js`
- Create: `tprobbs/views/pages/boards/list.ejs`
- Create: `tprobbs/views/pages/boards/view.ejs`
- Create: `tprobbs/views/pages/boards/post.ejs`

*[Detailed steps follow same pattern as above - write route, write templates, test, commit]*

### Task 13: Write Email Routes

**Files:**
- Create: `tprobbs/src/routes/email.js`
- Create: `tprobbs/views/pages/email/inbox.ejs`
- Create: `tprobbs/views/pages/email/read.ejs`
- Create: `tprobbs/views/pages/email/compose.ejs`

---

## Phase 3: Combat (Dungeon & Arena)

### Task 14: Write Combat Routes (Dungeon)

**Files:**
- Create: `tprobbs/src/routes/combat.js`
- Create: `tprobbs/views/pages/combat/dungeon.ejs`
- Create: `tprobbs/views/pages/combat/battle.ejs`

Key implementation notes:
- Dungeon grid stored in session (7 levels x 49 rooms)
- Room types determine encounters
- Combat is round-by-round with POST per action

### Task 15: Add Arena PvP Combat

**Files:**
- Modify: `tprobbs/src/routes/combat.js` (add arena routes)
- Create: `tprobbs/views/pages/combat/arena.ejs`
- Create: `tprobbs/views/pages/combat/pvp.ejs`

---

## Phase 4: Economy (Casino & Stores)

### Task 16: Write Games Routes (Casino)

**Files:**
- Create: `tprobbs/src/routes/games.js`
- Create: `tprobbs/views/pages/games/menu.ejs`
- Create: `tprobbs/views/pages/games/blackjack.ejs`
- Create: `tprobbs/views/pages/games/craps.ejs`
- Create: `tprobbs/views/pages/games/inbetween.ejs`
- Create: `tprobbs/views/pages/games/slots.ejs`

### Task 17: Write Stores Routes

**Files:**
- Create: `tprobbs/src/routes/stores.js`
- Create: `tprobbs/views/pages/stores/menu.ejs`
- Create: `tprobbs/views/pages/stores/weapons.ejs`
- Create: `tprobbs/views/pages/stores/armor.ejs`
- Create: `tprobbs/views/pages/stores/spells.ejs`
- Create: `tprobbs/views/pages/stores/homes.ejs`
- Create: `tprobbs/views/pages/stores/security.ejs`
- Create: `tprobbs/views/pages/stores/bank.ejs`

---

## Phase 5: Social (Gangs & Voting)

### Task 18: Write Gangs Routes

**Files:**
- Create: `tprobbs/src/routes/gangs.js`
- Create: `tprobbs/views/pages/gangs/list.ejs`
- Create: `tprobbs/views/pages/gangs/create.ejs`
- Create: `tprobbs/views/pages/gangs/manage.ejs`
- Create: `tprobbs/views/pages/gangs/fight.ejs`

### Task 19: Add Voting Booth

**Files:**
- Modify: `tprobbs/src/routes/main.js` (add voting routes)
- Create: `tprobbs/views/pages/vote.ejs`

---

## Final Integration

### Task 20: Update Root Landing Page

**Files:**
- Modify: `views/index.ejs` (add TPro BBS to game list)

### Task 21: Final Testing & Documentation

- Test all routes
- Verify database integrity
- Update root README if needed
- Final commit and tag

---

## Summary

This plan implements TPro BBS in 5 phases with 21 tasks:

1. **Phase 1** (Tasks 1-11): Core infrastructure, auth, main menu
2. **Phase 2** (Tasks 12-13): Message boards and email
3. **Phase 3** (Tasks 14-15): Dungeon and arena combat
4. **Phase 4** (Tasks 16-17): Casino games and stores
5. **Phase 5** (Tasks 18-21): Gangs, voting, and final integration

Each task is atomic with clear test/commit steps.
