/**
 * TPro BBS Database Ensure Script
 *
 * Safe to run on every startup - creates tables if missing, seeds if empty.
 * Does NOT delete existing data (unlike init.js which resets everything).
 *
 * Usage:
 *   node src/db/ensure.js           # Standalone
 *   require('./db/ensure')          # Import in app startup
 */

const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const DB_PATH = process.env.TPROBBS_DATABASE_PATH || path.join(__dirname, '../../data/tprobbs.db');

function ensureDatabase() {
    const dbDir = path.dirname(DB_PATH);

    // Create data directory if needed
    if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
        console.log('[TPro BBS] Created data directory');
    }

    const dbExists = fs.existsSync(DB_PATH);
    const db = new Database(DB_PATH);
    db.pragma('foreign_keys = ON');

    // Check if tables exist
    const tablesExist = db.prepare(`
        SELECT COUNT(*) as count FROM sqlite_master
        WHERE type='table' AND name='users'
    `).get().count > 0;

    if (!tablesExist) {
        console.log('[TPro BBS] Creating database schema...');
        const schemaPath = path.join(__dirname, 'schema.sql');
        const schema = fs.readFileSync(schemaPath, 'utf8');
        db.exec(schema);
        console.log('[TPro BBS] Schema created');
    }

    // Check if game data is seeded
    const weaponCount = db.prepare('SELECT COUNT(*) as count FROM weapons').get().count;

    if (weaponCount === 0) {
        console.log('[TPro BBS] Seeding game data...');
        const seedPath = path.join(__dirname, 'seed.sql');
        const seed = fs.readFileSync(seedPath, 'utf8');
        db.exec(seed);

        const newWeaponCount = db.prepare('SELECT COUNT(*) as count FROM weapons').get().count;
        const monsterCount = db.prepare('SELECT COUNT(*) as count FROM monsters').get().count;
        const classCount = db.prepare('SELECT COUNT(*) as count FROM classes').get().count;

        console.log(`[TPro BBS] Seeded: ${newWeaponCount} weapons, ${monsterCount} monsters, ${classCount} classes`);
    }

    // Log status
    const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
    console.log(`[TPro BBS] Database ready: ${DB_PATH} (${userCount} users)`);

    db.close();
    return DB_PATH;
}

// Run if called directly
if (require.main === module) {
    ensureDatabase();
}

module.exports = ensureDatabase;
