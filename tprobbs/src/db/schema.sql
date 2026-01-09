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
