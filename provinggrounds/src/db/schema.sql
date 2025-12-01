-- Proving Grounds BBS Database Schema
-- Based on original Apple II data structures

-- Weapons (equivalent to WEAPONS file - 40 bytes per record)
-- Must be created before users due to foreign key
CREATE TABLE IF NOT EXISTS weapons (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    price INTEGER NOT NULL,
    power INTEGER NOT NULL,
    level_required INTEGER DEFAULT 1,
    magical INTEGER DEFAULT 0  -- 0 = mundane, 1 = magical (only found in dungeons)
);

-- Armor (equivalent to ARMOR file - 40 bytes per record)
-- Must be created before users due to foreign key
CREATE TABLE IF NOT EXISTS armor (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    price INTEGER NOT NULL,
    power INTEGER NOT NULL,
    level_required INTEGER DEFAULT 1,
    magical INTEGER DEFAULT 0
);

-- Spells (equivalent to SPELLS file)
-- Must be created before users due to potential foreign keys
CREATE TABLE IF NOT EXISTS spells (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    price INTEGER NOT NULL,
    power INTEGER DEFAULT 0,
    cost INTEGER DEFAULT 5,
    is_battle INTEGER DEFAULT 0,
    is_peace INTEGER DEFAULT 0,
    level_required INTEGER DEFAULT 1
);

-- Users (equivalent to STATS file - 200 bytes per record)
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,

    -- Character info
    name TEXT NOT NULL,
    real_name TEXT DEFAULT '',
    status TEXT DEFAULT 'Alive',  -- 'Alive', 'Dead'
    level INTEGER DEFAULT 1,

    -- Core stats
    strength INTEGER DEFAULT 10,
    agility INTEGER DEFAULT 10,
    wisdom INTEGER DEFAULT 10,
    intelligence INTEGER DEFAULT 10,

    -- Combat stats
    hp INTEGER DEFAULT 20,
    max_hp INTEGER DEFAULT 20,
    power INTEGER DEFAULT 20,
    max_power INTEGER DEFAULT 20,

    -- Equipment (references weapons/armor IDs)
    weapon_id INTEGER DEFAULT 1,
    armor_id INTEGER DEFAULT 1,

    -- Economy
    gold INTEGER DEFAULT 100,
    bank INTEGER DEFAULT 0,
    experience INTEGER DEFAULT 0,
    food INTEGER DEFAULT 10,

    -- Combat record
    kills INTEGER DEFAULT 0,
    deaths INTEGER DEFAULT 0,
    monsters_killed INTEGER DEFAULT 0,

    -- Access & validation
    validation_level TEXT DEFAULT 'new',  -- 'new', 'half', 'full'
    adventure_access INTEGER DEFAULT 0,

    -- Daily limits
    calls_today INTEGER DEFAULT 0,
    calls_per_day INTEGER DEFAULT 2,
    extra_calls INTEGER DEFAULT 0,  -- Bonus calls that can be earned/granted
    total_calls INTEGER DEFAULT 0,
    last_call_date TEXT,

    -- Admin flag
    is_admin INTEGER DEFAULT 0,  -- 0 = normal user, 1 = admin (bypasses limits)

    -- Combat tracking
    fights_today INTEGER DEFAULT 0,
    jousts_today INTEGER DEFAULT 0,

    -- Castle protection
    castle_protection INTEGER DEFAULT 0,  -- 0 = off, 1 = on
    castle_rent_paid INTEGER DEFAULT 0,

    -- Adventure save state
    adventure_room INTEGER DEFAULT 0,
    adventure_data TEXT,  -- JSON for inventory, coordinates, etc.

    -- Voting
    voted_today INTEGER DEFAULT 0,

    -- Timestamps
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_login DATETIME,

    -- User message (shown on main menu)
    user_message TEXT DEFAULT '',

    FOREIGN KEY (weapon_id) REFERENCES weapons(id),
    FOREIGN KEY (armor_id) REFERENCES armor(id)
);

-- User spells inventory
CREATE TABLE IF NOT EXISTS user_spells (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    spell_id INTEGER NOT NULL,
    quantity INTEGER DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (spell_id) REFERENCES spells(id),
    UNIQUE(user_id, spell_id)
);

-- Monsters (equivalent to MONSTERS file - 60 bytes per record)
CREATE TABLE IF NOT EXISTS monsters (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    strength INTEGER NOT NULL,
    hp INTEGER NOT NULL,
    gold INTEGER NOT NULL,
    experience INTEGER NOT NULL,
    level INTEGER NOT NULL  -- 1-10
);

-- Levels/Ranks (equivalent to LEVELS file)
CREATE TABLE IF NOT EXISTS levels (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    level INTEGER UNIQUE NOT NULL,
    title TEXT NOT NULL,
    experience_required INTEGER NOT NULL
);

-- Message Boards (equivalent to BOARDS file - 55 bytes per record)
CREATE TABLE IF NOT EXISTS boards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,

    -- Access control
    post_access INTEGER DEFAULT 2,    -- 1=sysop, 2=validated, 3=all, 4=password
    read_access INTEGER DEFAULT 2,    -- 1=validated, 2=all
    post_mode INTEGER DEFAULT 3,      -- 1=anonymous, 2=any handle, 3=real name
    password TEXT,

    -- Board master (user who can moderate)
    board_master_id INTEGER,

    -- Settings
    max_messages INTEGER DEFAULT 50,
    active INTEGER DEFAULT 1,

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (board_master_id) REFERENCES users(id)
);

-- Messages (equivalent to message files)
CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    board_id INTEGER NOT NULL,
    subject TEXT NOT NULL,
    body TEXT NOT NULL,
    author_id INTEGER NOT NULL,
    author_name TEXT NOT NULL,  -- May differ from actual name (anonymous/alias)
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE CASCADE,
    FOREIGN KEY (author_id) REFERENCES users(id)
);

-- User read tracking for quickscan
CREATE TABLE IF NOT EXISTS message_reads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    board_id INTEGER NOT NULL,
    last_read_message_id INTEGER DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE CASCADE,
    UNIQUE(user_id, board_id)
);

-- Email/Private Messages
CREATE TABLE IF NOT EXISTS mail (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    from_user_id INTEGER NOT NULL,
    to_user_id INTEGER NOT NULL,
    subject TEXT NOT NULL,
    body TEXT NOT NULL,
    is_read INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (from_user_id) REFERENCES users(id),
    FOREIGN KEY (to_user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Castle configurations (equivalent to CASTLES file - 39 bytes per record)
CREATE TABLE IF NOT EXISTS castle_rooms (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    room_number INTEGER NOT NULL,  -- 1-19
    monster_level INTEGER DEFAULT 0,  -- 0 = none, 1-10 = level
    trap_spell_id INTEGER DEFAULT NULL,  -- NULL = none
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (trap_spell_id) REFERENCES spells(id),
    UNIQUE(user_id, room_number)
);

-- Fight outcomes log (CSTAT file)
CREATE TABLE IF NOT EXISTS fight_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    attacker_id INTEGER NOT NULL,
    defender_id INTEGER,  -- NULL for monster fights
    monster_id INTEGER,   -- NULL for user fights
    winner TEXT NOT NULL,  -- 'attacker' or 'defender'
    gold_gained INTEGER DEFAULT 0,
    experience_gained INTEGER DEFAULT 0,
    weapon_gained INTEGER DEFAULT 0,  -- weapon_id or 0
    armor_gained INTEGER DEFAULT 0,   -- armor_id or 0
    message TEXT,  -- Post-fight message from winner
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (attacker_id) REFERENCES users(id),
    FOREIGN KEY (defender_id) REFERENCES users(id),
    FOREIGN KEY (monster_id) REFERENCES monsters(id)
);

-- Death log (DEATH file - 50 bytes per record)
CREATE TABLE IF NOT EXISTS death_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    killer_id INTEGER,  -- NULL if killed by monster/self
    cause TEXT NOT NULL,
    details TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (killer_id) REFERENCES users(id)
);

-- Joust records (DOWNS file - 17 bytes per record)
CREATE TABLE IF NOT EXISTS joust_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER UNIQUE NOT NULL,
    wins INTEGER DEFAULT 0,
    losses INTEGER DEFAULT 0,
    bonus_wins INTEGER DEFAULT 0,  -- Tracked for stat bonuses at 20 wins
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- User rankings (TOP file - 35 bytes per record)
CREATE TABLE IF NOT EXISTS rankings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER UNIQUE NOT NULL,
    rank_position INTEGER NOT NULL,
    level INTEGER NOT NULL,
    status TEXT DEFAULT 'A',  -- 'A' = alive, 'D' = dead
    last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Voting topics and responses
CREATE TABLE IF NOT EXISTS voting_topics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    question TEXT NOT NULL,
    active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS voting_options (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    topic_id INTEGER NOT NULL,
    option_text TEXT NOT NULL,
    votes INTEGER DEFAULT 0,
    FOREIGN KEY (topic_id) REFERENCES voting_topics(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS user_votes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    topic_id INTEGER NOT NULL,
    option_id INTEGER NOT NULL,
    voted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (topic_id) REFERENCES voting_topics(id),
    FOREIGN KEY (option_id) REFERENCES voting_options(id),
    UNIQUE(user_id, topic_id)
);

-- Daily caller log (LOG file)
CREATE TABLE IF NOT EXISTS call_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    login_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    logout_time DATETIME,
    validation_status TEXT,
    used_adventure INTEGER DEFAULT 0,
    extra_calls INTEGER DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- System configuration
CREATE TABLE IF NOT EXISTS config (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);

-- Adventure room descriptions (DES file - 410 bytes per record)
CREATE TABLE IF NOT EXISTS adventure_rooms (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    room_number INTEGER UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    north INTEGER DEFAULT 0,  -- Room numbers, 0 = blocked, negative = force field
    south INTEGER DEFAULT 0,
    east INTEGER DEFAULT 0,
    west INTEGER DEFAULT 0,
    special_event INTEGER DEFAULT 0,  -- Event code from original
    item TEXT,  -- Item in room
    trigger TEXT,  -- Use trigger item
    shop_type INTEGER DEFAULT 0  -- 1=weapons, 2=healing, 3=food
);

-- Adventure characters (CHAR file - 200 bytes per record)
CREATE TABLE IF NOT EXISTS adventure_npcs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    bribe_cost INTEGER DEFAULT 0,
    gift_item TEXT,
    dialogue TEXT
);

-- Adventure items (ITEMS file)
CREATE TABLE IF NOT EXISTS adventure_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    usable INTEGER DEFAULT 0,
    effect TEXT  -- JSON describing effect
);

-- Session tracking for real-time features
CREATE TABLE IF NOT EXISTS active_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER UNIQUE NOT NULL,
    session_id TEXT NOT NULL,
    socket_id TEXT,
    logged_in_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_activity DATETIME DEFAULT CURRENT_TIMESTAMP,
    current_location TEXT DEFAULT 'main',  -- Current module/screen
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- News/updates (NEWS file)
CREATE TABLE IF NOT EXISTS news (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER,
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Indices for performance
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_level ON users(level);
CREATE INDEX IF NOT EXISTS idx_messages_board ON messages(board_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at);
CREATE INDEX IF NOT EXISTS idx_mail_to_user ON mail(to_user_id);
CREATE INDEX IF NOT EXISTS idx_fight_log_date ON fight_log(created_at);
CREATE INDEX IF NOT EXISTS idx_rankings_position ON rankings(rank_position);
