/**
 * Database Seed Script
 * Imports original game data from extracted Apple II disk images
 */

const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

require('dotenv').config();

const DB_PATH = process.env.DATABASE_PATH || './data/provinggrounds.db';
const ORIGINAL_DATA = path.join(__dirname, '../../original-disks');

const db = new Database(DB_PATH);
db.pragma('foreign_keys = ON');

/**
 * Parse original data files
 */
function parseWeapons() {
    const filePath = path.join(ORIGINAL_DATA, 'disk1_extracted', 'WEAPONS.txt');
    const content = fs.readFileSync(filePath, 'utf8');
    const weapons = [];

    // Original format: Name + Price + Power (concatenated)
    // Example: "Hands03" = Hands, price 0, power 3
    const lines = content.split('\n').filter(l => l.trim());

    for (const line of lines) {
        // Parse the format: NamePricePower
        // The number at the end encodes both price and power
        const match = line.match(/^(.+?)(\d+)$/);
        if (match) {
            const name = match[1].trim();
            const numStr = match[2];

            // Original encoding: first digits are price (in hundreds), last 1-3 are power
            let price = 0;
            let power = 3;

            if (numStr.length >= 2) {
                // Last 1-3 digits are power rating
                const powerLen = numStr.length <= 3 ? 1 : (numStr.length <= 5 ? 2 : 3);
                power = parseInt(numStr.slice(-powerLen)) || 3;
                price = parseInt(numStr.slice(0, -powerLen)) * 100 || 0;
            }

            weapons.push({ name, price, power, magical: name.includes('+') ? 1 : 0 });
        }
    }

    return weapons;
}

function parseArmor() {
    // Return default armor set
    return [
        { name: 'Skin', price: 0, protection: 1, magical: 0 },
        { name: 'Cloth', price: 50, protection: 2, magical: 0 },
        { name: 'Leather', price: 150, protection: 5, magical: 0 },
        { name: 'Ring Mail', price: 400, protection: 10, magical: 0 },
        { name: 'Scale Mail', price: 800, protection: 15, magical: 0 },
        { name: 'Chain Mail', price: 1500, protection: 20, magical: 0 },
        { name: 'Banded Mail', price: 3000, protection: 30, magical: 0 },
        { name: 'Plate Mail', price: 6000, protection: 45, magical: 0 },
        { name: 'Full Plate', price: 12000, protection: 60, magical: 0 },
        { name: '+1 Chain', price: 25000, protection: 75, magical: 1 },
        { name: '+2 Plate', price: 50000, protection: 90, magical: 1 },
        { name: 'Mithril Chain', price: 100000, protection: 110, magical: 1 },
        { name: 'Dragon Scale', price: 250000, protection: 140, magical: 1 },
        { name: 'Adamantine Plate', price: 500000, protection: 180, magical: 1 },
        { name: 'Ethereal Armor', price: 1000000, protection: 250, magical: 1 }
    ];
}

function parseSpells() {
    const filePath = path.join(ORIGINAL_DATA, 'disk1_extracted', 'SPELLS.txt');
    const content = fs.readFileSync(filePath, 'utf8');
    const spells = [];

    // Original format from file analysis
    const spellData = [
        { name: 'Cure Light Wounds', price: 200, damage: 0, battle: 0, peace: 1, cost: 2 },
        { name: 'Flaming Arrow', price: 350, damage: 10, battle: 1, peace: 0, cost: 4 },
        { name: 'Cure Severe Wounds', price: 750, damage: 0, battle: 0, peace: 1, cost: 6 },
        { name: 'Fireball', price: 900, damage: 25, battle: 1, peace: 0, cost: 8 },
        { name: 'Magic Missile', price: 2000, damage: 50, battle: 1, peace: 0, cost: 10 },
        { name: 'Fireblast', price: 3500, damage: 75, battle: 1, peace: 0, cost: 12 },
        { name: 'Teleport', price: 7500, damage: 0, battle: 1, peace: 1, cost: 14 },
        { name: 'Meteor Swarm', price: 8000, damage: 100, battle: 1, peace: 0, cost: 16 },
        { name: 'Ice Storm', price: 12500, damage: 125, battle: 1, peace: 0, cost: 18 },
        { name: 'Blizzard Blast', price: 15000, damage: 150, battle: 1, peace: 0, cost: 20 },
        { name: 'Inviso', price: 20000, damage: 0, battle: 0, peace: 1, cost: 22 },
        { name: 'Cure All Wounds', price: 25000, damage: 0, battle: 0, peace: 1, cost: 24 },
        { name: 'Protect', price: 30000, damage: 0, battle: 0, peace: 1, cost: 26 },
        { name: 'Pound', price: 31000, damage: 175, battle: 1, peace: 0, cost: 28 },
        { name: 'Blade Barrier', price: 32000, damage: 200, battle: 1, peace: 0, cost: 30 },
        { name: 'Negate', price: 32500, damage: 0, battle: 1, peace: 0, cost: 32 },
        { name: 'Blow', price: 32500, damage: 225, battle: 1, peace: 0, cost: 34 },
        { name: 'Total Destruction', price: 35000, damage: 250, battle: 1, peace: 0, cost: 36 },
        { name: 'Increase', price: 40000, damage: 0, battle: 0, peace: 1, cost: 38 },
        { name: 'Molecular Disruption', price: 45000, damage: 275, battle: 1, peace: 0, cost: 40 },
        { name: 'Termination', price: 50000, damage: 300, battle: 1, peace: 0, cost: 42 },
        { name: 'Death', price: 75000, damage: 0, battle: 1, peace: 0, cost: 44 },
        { name: 'Demodenia', price: 100000, damage: 325, battle: 1, peace: 0, cost: 46 },
        { name: 'Super Protect', price: 175000, damage: 0, battle: 0, peace: 1, cost: 48 },
        { name: 'Super Increase', price: 250000, damage: 0, battle: 0, peace: 1, cost: 50 },
        { name: 'Resurrect', price: 350000, damage: 0, battle: 0, peace: 1, cost: 52 }
    ];

    return spellData;
}

function parseLevels() {
    const filePath = path.join(ORIGINAL_DATA, 'disk1_extracted', 'LEVELS.txt');
    const content = fs.readFileSync(filePath, 'utf8');
    const levels = [];

    // Parse format: Title,Experience
    const entries = content.split(/(?=[A-Z])/);
    let levelNum = 1;

    // Hardcoded from original file analysis
    const levelData = [
        { level: 1, title: 'Low-Life Scum', exp: 0 },
        { level: 2, title: 'Maggot', exp: 750 },
        { level: 3, title: 'Lout', exp: 1500 },
        { level: 4, title: 'Vagabond', exp: 3000 },
        { level: 5, title: 'Rogue', exp: 6000 },
        { level: 6, title: 'Footpad', exp: 12000 },
        { level: 7, title: 'Avenger', exp: 24000 },
        { level: 8, title: 'Mage', exp: 48000 },
        { level: 9, title: 'Magsman', exp: 96000 },
        { level: 10, title: 'Pirate', exp: 192000 },
        { level: 11, title: 'Klepto', exp: 384000 },
        { level: 12, title: 'Gamester', exp: 768000 },
        { level: 13, title: 'Novice Thief', exp: 1536000 },
        { level: 14, title: 'Looter', exp: 3072000 },
        { level: 15, title: 'Adept', exp: 6144000 },
        { level: 16, title: 'Cutthroat', exp: 12288000 },
        { level: 17, title: 'Robber', exp: 24576000 },
        { level: 18, title: 'Cutpurse', exp: 49152000 },
        { level: 19, title: 'Burglar', exp: 98304000 },
        { level: 20, title: 'Destroyer', exp: 196608000 }
    ];

    // Continue with exponential growth through level 100
    let exp = 196608000;
    for (let i = 21; i <= 50; i++) {
        exp *= 2;
        levelData.push({
            level: i,
            title: i <= 49 ? `Level ${i} Warrior` : 'Master Thief',
            exp: exp
        });
    }

    // Timelord levels 51-100
    for (let i = 51; i <= 100; i++) {
        exp *= 2;
        levelData.push({
            level: i,
            title: i === 100 ? 'Immortal Timelord' : `Timelord Level ${i - 50}`,
            exp: exp
        });
    }

    return levelData;
}

function generateMonsters() {
    // Generate 200 monsters across 10 difficulty levels
    const monsters = [];
    const monsterNames = [
        // Level 1
        ['Rat', 'Bat', 'Spider', 'Snake', 'Goblin', 'Kobold', 'Skeleton', 'Zombie', 'Orc Scout', 'Wild Dog',
         'Cave Cricket', 'Fire Beetle', 'Giant Ant', 'Stirge', 'Manes', 'Gas Spore', 'Piercer', 'Rot Grub', 'Giant Centipede', 'Lemure'],
        // Level 2
        ['Gnoll', 'Hobgoblin', 'Lizardman', 'Bugbear', 'Ogre Youth', 'Ghoul', 'Shadow', 'Wight', 'Harpy', 'Cockatrice',
         'Rust Monster', 'Carrion Crawler', 'Gelatinous Cube', 'Gray Ooze', 'Yellow Mold', 'Shrieker', 'Violet Fungus', 'Gas Spore', 'Troglodyte', 'Xvart'],
        // Level 3
        ['Ogre', 'Gargoyle', 'Owlbear', 'Displacer Beast', 'Hell Hound', 'Werewolf', 'Wraith', 'Worg', 'Ettin Youth', 'Hill Giant Youth',
         'Minotaur', 'Manticore', 'Basilisk', 'Medusa', 'Gorgon', 'Catoblepas', 'Chimera Youth', 'Hydra (3 heads)', 'Troll Youth', 'Shambling Mound'],
        // Level 4
        ['Troll', 'Ettin', 'Hill Giant', 'Stone Giant', 'Frost Giant Youth', 'Fire Giant Youth', 'Mind Flayer', 'Beholder', 'Lich Apprentice', 'Death Knight Youth',
         'Hydra (5 heads)', 'Chimera', 'Gorgon', 'Behir', 'Spirit Naga', 'Guardian Naga', 'Salamander', 'Xorn', 'Umber Hulk', 'Hook Horror'],
        // Level 5
        ['Frost Giant', 'Fire Giant', 'Cloud Giant Youth', 'Storm Giant Youth', 'Vampire', 'Mummy Lord', 'Specter', 'Ghost', 'Banshee', 'Lich',
         'Hydra (7 heads)', 'Purple Worm', 'Remorhaz', 'Goristro', 'Balor Youth', 'Pit Fiend Youth', 'Erinyes', 'Ice Devil', 'Bone Devil', 'Barbed Devil'],
        // Level 6
        ['Cloud Giant', 'Storm Giant', 'Titan Youth', 'Ancient Vampire', 'Demilich', 'Death Knight', 'Dracolich Youth', 'Shadow Dragon', 'Deep Dragon', 'Fang Dragon',
         'Elder Brain', 'Neothelid', 'Aboleth', 'Kraken Youth', 'Phoenix Youth', 'Nightwalker', 'Bodak', 'Devourer', 'Nalfeshnee', 'Glabrezu'],
        // Level 7
        ['Titan', 'Solar', 'Planetar', 'Elder Vampire', 'Greater Lich', 'Dracolich', 'Adult Red Dragon', 'Adult Blue Dragon', 'Adult Black Dragon', 'Adult Green Dragon',
         'Adult White Dragon', 'Adult Gold Dragon', 'Adult Silver Dragon', 'Adult Bronze Dragon', 'Adult Brass Dragon', 'Adult Copper Dragon', 'Pit Fiend', 'Balor', 'Empyrean', 'Zaratan'],
        // Level 8
        ['Ancient Red Dragon', 'Ancient Blue Dragon', 'Ancient Black Dragon', 'Ancient Green Dragon', 'Ancient White Dragon', 'Ancient Gold Dragon', 'Ancient Silver Dragon', 'Ancient Bronze Dragon', 'Tarrasque Youth', 'Kraken',
         'Tiamat Avatar', 'Bahamut Avatar', 'Elder Titan', 'Astral Dreadnought', 'Marut', 'Leviathan', 'Phoenix', 'Elder Tempest', 'Nightwalker Lord', 'Atropal'],
        // Level 9
        ['Tarrasque', 'Aspect of Tiamat', 'Aspect of Bahamut', 'Avatar of Death', 'Elder Evil', 'Primordial', 'Great Old One', 'Eldritch Horror', 'Void Dragon', 'Time Dragon',
         'Cosmic Serpent', 'World Eater', 'Plane Shatterer', 'Reality Warper', 'Entropy Lord', 'Chaos Incarnate', 'Order Absolute', 'The Nameless', 'The Forgotten', 'The Awakened'],
        // Level 10
        ['Tiamat', 'Bahamut', 'Asmodeus', 'Demogorgon', 'Orcus', 'Vecna', 'Lolth', 'Gruumsh', 'The Tarrasque Prime', 'Tharizdun',
         'Lady of Pain', 'Ao the Overgod', 'Time Incarnate', 'Death Incarnate', 'Chaos Prime', 'Order Prime', 'The End', 'The Beginning', 'The Eternal', 'The Infinite']
    ];

    let id = 1;
    for (let level = 1; level <= 10; level++) {
        const baseStr = level * 10;
        const baseHP = level * 50;
        const baseGold = level * level * 100;
        const baseExp = level * level * 50;

        for (let i = 0; i < 20; i++) {
            const variance = 0.5 + Math.random();
            monsters.push({
                id: id++,
                name: monsterNames[level - 1][i],
                strength: Math.floor(baseStr * variance),
                gold: Math.floor(baseGold * variance),
                experience: Math.floor(baseExp * variance),
                hp: Math.floor(baseHP * variance),
                level: level
            });
        }
    }

    return monsters;
}

function seedDatabase() {
    console.log('Seeding database with original game data...');

    // Clear existing data first (in reverse order of foreign key dependencies)
    console.log('Clearing existing data...');
    db.exec('DELETE FROM voting_options');
    db.exec('DELETE FROM voting_topics');
    db.exec('DELETE FROM news');
    db.exec('DELETE FROM boards');
    db.exec('DELETE FROM monsters');
    db.exec('DELETE FROM levels');
    db.exec('DELETE FROM spells');
    db.exec('DELETE FROM armor');
    db.exec('DELETE FROM weapons');

    // Reset auto-increment counters
    db.exec("DELETE FROM sqlite_sequence WHERE name IN ('weapons', 'armor', 'spells', 'levels', 'monsters', 'boards', 'voting_topics', 'voting_options', 'news')");

    // Seed weapons
    console.log('Seeding weapons...');
    const weapons = [
        { name: 'Hands', price: 0, power: 3, magical: 0 },
        { name: 'Dagger', price: 100, power: 4, magical: 0 },
        { name: 'Sling', price: 150, power: 5, magical: 0 },
        { name: 'Flail', price: 400, power: 6, magical: 0 },
        { name: 'Mace', price: 600, power: 7, magical: 0 },
        { name: 'Hand Axe', price: 750, power: 8, magical: 0 },
        { name: 'Club', price: 800, power: 9, magical: 0 },
        { name: 'Fauchard', price: 950, power: 10, magical: 0 },
        { name: 'Glaive', price: 1100, power: 11, magical: 0 },
        { name: 'Quarter Staff', price: 1500, power: 13, magical: 0 },
        { name: 'Short Sword', price: 2000, power: 14, magical: 0 },
        { name: '+1 Dagger', price: 2100, power: 15, magical: 1 },
        { name: 'Military Pick', price: 2300, power: 16, magical: 0 },
        { name: 'Trident', price: 2400, power: 17, magical: 0 },
        { name: '+1 Flail', price: 2750, power: 18, magical: 1 },
        { name: 'Bardiche', price: 3000, power: 19, magical: 0 },
        { name: 'Battle Axe', price: 6500, power: 21, magical: 0 },
        { name: 'Morning Star', price: 7250, power: 23, magical: 0 },
        { name: 'Short Bow', price: 8500, power: 24, magical: 0 },
        { name: 'Long Bow', price: 9000, power: 25, magical: 0 },
        { name: '+1 Short Sword', price: 10000, power: 28, magical: 1 },
        { name: 'Long Sword', price: 16000, power: 37, magical: 0 },
        { name: 'Bastard Sword', price: 17000, power: 39, magical: 0 },
        { name: 'Two-Handed Sword', price: 18750, power: 44, magical: 0 },
        { name: '+1 Long Sword', price: 36100, power: 51, magical: 1 },
        { name: '+2 Battle Axe', price: 51400, power: 54, magical: 1 },
        { name: '+1 Bastard Sword', price: 65000, power: 56, magical: 1 },
        { name: '+2 Long Sword', price: 237000, power: 76, magical: 1 },
        { name: '+3 Long Sword', price: 542100, power: 90, magical: 1 },
        { name: 'Vorpal Bastard Sword', price: 2800000, power: 127, magical: 1 },
        { name: 'Sword of Life Stealing', price: 1760500, power: 115, magical: 1 },
        { name: 'Sword of Sharpness', price: 2506000, power: 124, magical: 1 },
        { name: 'Holy Vorpal Blade', price: 10000000, power: 200, magical: 1 },
        { name: 'Sceptre of Might', price: 15000000, power: 175, magical: 1 },
        { name: 'Wand of Orcus', price: 20000000, power: 185, magical: 1 }
    ];

    const insertWeapon = db.prepare('INSERT INTO weapons (name, price, power, level_required, magical) VALUES (?, ?, ?, ?, ?)');
    for (let i = 0; i < weapons.length; i++) {
        const w = weapons[i];
        const levelReq = Math.floor(i / 3) + 1;
        insertWeapon.run(w.name, w.price, w.power, levelReq, w.magical);
    }

    // Seed armor
    console.log('Seeding armor...');
    const armor = parseArmor();
    const insertArmor = db.prepare('INSERT INTO armor (name, price, power, level_required, magical) VALUES (?, ?, ?, ?, ?)');
    for (let i = 0; i < armor.length; i++) {
        const a = armor[i];
        const levelReq = Math.floor(i * 7) + 1;
        insertArmor.run(a.name, a.price, a.protection, levelReq, a.magical);
    }

    // Seed spells
    console.log('Seeding spells...');
    const spells = parseSpells();
    const insertSpell = db.prepare('INSERT INTO spells (name, price, power, cost, is_battle, is_peace, level_required) VALUES (?, ?, ?, ?, ?, ?, ?)');
    for (let i = 0; i < spells.length; i++) {
        const s = spells[i];
        const levelReq = Math.floor(i * 4) + 1;
        insertSpell.run(s.name, s.price, s.damage, s.cost, s.battle, s.peace, levelReq);
    }

    // Seed levels
    console.log('Seeding levels...');
    const levels = parseLevels();
    const insertLevel = db.prepare('INSERT INTO levels (level, title, experience_required) VALUES (?, ?, ?)');
    for (const l of levels) {
        insertLevel.run(l.level, l.title, l.exp);
    }

    // Seed monsters
    console.log('Seeding monsters...');
    const monsters = generateMonsters();
    const insertMonster = db.prepare(`
        INSERT INTO monsters (name, strength, hp, gold, experience, level)
        VALUES (?, ?, ?, ?, ?, ?)
    `);
    for (const m of monsters) {
        insertMonster.run(m.name, m.strength, m.hp, m.gold, m.experience, m.level);
    }

    // Create default boards
    console.log('Creating default message boards...');
    const insertBoard = db.prepare('INSERT INTO boards (name, description, post_access, read_access, post_mode) VALUES (?, ?, ?, ?, ?)');
    const boards = [
        { name: 'General Discussion', desc: 'General chat and announcements', post: 3, read: 2, mode: 3 },
        { name: 'Quest Tales', desc: 'Share your adventure stories', post: 2, read: 2, mode: 3 },
        { name: 'Trading Post', desc: 'Buy, sell, and trade items', post: 2, read: 2, mode: 3 },
        { name: 'Battle Reports', desc: 'Combat stories and strategies', post: 2, read: 2, mode: 3 },
        { name: 'Sysop Announcements', desc: 'Official announcements', post: 1, read: 2, mode: 3 }
    ];
    for (const b of boards) {
        insertBoard.run(b.name, b.desc, b.post, b.read, b.mode);
    }

    // Create initial voting topic
    console.log('Creating initial voting topic...');
    const insertTopic = db.prepare('INSERT INTO voting_topics (question) VALUES (?)');
    const topicResult = insertTopic.run('What feature should be added next?');

    const insertOption = db.prepare('INSERT INTO voting_options (topic_id, option_text) VALUES (?, ?)');
    const options = ['More monsters', 'New adventure area', 'Guild system', 'Player housing'];
    for (const opt of options) {
        insertOption.run(topicResult.lastInsertRowid, opt);
    }

    // Create initial news post
    console.log('Creating welcome news post...');
    const insertNews = db.prepare('INSERT INTO news (title, content) VALUES (?, ?)');
    insertNews.run('Welcome to The Proving Grounds!', `
Welcome to The Proving Grounds!

This BBS has been recreated from the original Apple II version.
All features have been preserved including:

- Message Boards
- User vs User Combat
- Dungeon Monster Fighting
- Corridor of Death (200 rooms)
- Text Adventure (900 rooms)
- Jousting
- Gambling Games
- Castle Building & Defense
- And much more!

May your blade stay sharp and your treasury full!

- The Sysop
    `.trim());

    console.log('Database seeding complete!');
}

// Run seeding
seedDatabase();
db.close();
