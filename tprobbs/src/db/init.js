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
