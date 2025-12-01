/**
 * Database Initialization Script
 * Creates the database and tables for Proving Grounds BBS
 */

const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

require('dotenv').config();

const DB_PATH = process.env.DATABASE_PATH || './data/provinggrounds.db';

// Ensure data directory exists
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

// Create database connection
const db = new Database(DB_PATH);

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Read and execute schema
const schemaPath = path.join(__dirname, 'schema.sql');
const schema = fs.readFileSync(schemaPath, 'utf8');

console.log('Initializing database...');

// Execute entire schema at once (SQLite handles multiple statements)
try {
    db.exec(schema);
    console.log('Database schema created successfully!');
} catch (err) {
    console.error('Error executing schema:', err.message);
    process.exit(1);
}

// Insert default configuration
const insertConfig = db.prepare('INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)');

const defaultConfig = {
    bbs_name: process.env.BBS_NAME || 'The Proving Grounds',
    sysop_name: process.env.SYSOP_NAME || 'Sysop',
    max_users: process.env.MAX_USERS || '500',
    calls_per_day: process.env.CALLS_PER_DAY || '2',
    minutes_per_call: process.env.MINUTES_PER_CALL || '60',
    max_level: '100',
    fight_level_range: '2',  // Can fight users 2 levels below
    max_fights_per_day: '4',
    max_jousts_per_day: '2',
    corridor_rooms: '200',
    adventure_rooms: '900',
    registration_captcha: process.env.REGISTRATION_CAPTCHA || '0',  // 0=disabled, 1=enabled
    version: '1.0.0'
};

for (const [key, value] of Object.entries(defaultConfig)) {
    insertConfig.run(key, value);
}

console.log('Default configuration inserted.');

db.close();
console.log('Database initialization complete!');
