# Database

TPro BBS uses SQLite via `better-sqlite3` for data persistence.

## Database Location

| Environment | Default Path |
|-------------|--------------|
| Development | `./tprobbs/data/tprobbs.db` |
| Production | `/data/tprobbs.db` |

Override with environment variable: `TPROBBS_DATABASE_PATH`

## Initialization Scripts

| Script | Purpose | Safe for Production? |
|--------|---------|---------------------|
| `node src/db/ensure.js` | Create/seed if needed | **Yes** - preserves data |
| `node src/db/init.js` | Reset everything | **No** - deletes all data |

### ensure.js (Production-Safe)

Runs automatically on every server startup:

1. Creates `data/` directory if missing
2. Creates schema if tables don't exist
3. Seeds game data (weapons, monsters, classes) if empty
4. **Preserves existing user data**

```javascript
// Safe to run on every startup
const ensureDatabase = require('./tprobbs/src/db/ensure');
ensureDatabase();
```

### init.js (Development Only)

Completely resets the database:

1. Deletes existing database file
2. Creates fresh schema
3. Seeds all game data
4. **Destroys all user data**

```bash
# Use only in development
cd tprobbs && node src/db/init.js
```

## Schema Overview

### Core Tables

```sql
-- Users (players)
users (
    id, username, password_hash,
    class_id, level, xp, gold, bank_gold,
    hp, max_hp, sp, max_sp,
    strength, stamina, intellect, charisma,
    weapon_id, armor_id, shield_id,
    gang_id, votes, voted_date,
    created_at, last_login
)

-- Game data
classes (id, name, str_mod, sta_mod, int_mod, cha_mod)
weapons (id, name, level, price)
armors (id, name, level, price)
shields (id, name, level, price)
spells (id, name, level, price, effect)
monsters (id, name, level, hp, attack, defense, xp_reward, gold_reward)

-- Player inventory
user_spells (user_id, spell_id)

-- Communication
boards (id, name, description)
messages (id, board_id, user_id, subject, body, created_at)
emails (id, from_user_id, to_user_id, subject, body, read, created_at)

-- Gangs
gangs (id, name, leader_id, gold, created_at)
```

## Database Queries

### Common Patterns

```javascript
// Get user with equipment
const user = db.prepare(`
    SELECT u.*,
           w.name as weapon_name, w.level as weapon_level,
           a.name as armor_name, a.level as armor_level,
           c.name as class_name
    FROM users u
    LEFT JOIN weapons w ON u.weapon_id = w.id
    LEFT JOIN armors a ON u.armor_id = a.id
    LEFT JOIN classes c ON u.class_id = c.id
    WHERE u.id = ?
`).get(userId);

// Update gold after purchase
db.prepare('UPDATE users SET gold = gold - ? WHERE id = ?')
    .run(price, userId);

// Get monsters for dungeon level
const monsters = db.prepare(`
    SELECT * FROM monsters WHERE level <= ? ORDER BY RANDOM() LIMIT 1
`).get(dungeonLevel);
```

## Backups

### Manual Backup

```bash
cp tprobbs/data/tprobbs.db tprobbs/data/tprobbs.db.backup
```

### Restore from Backup

```bash
cp tprobbs/data/tprobbs.db.backup tprobbs/data/tprobbs.db
```

## Foreign Keys

Foreign key constraints are enabled:

```javascript
db.pragma('foreign_keys = ON');
```

This ensures referential integrity (e.g., users can't have invalid class_id).
