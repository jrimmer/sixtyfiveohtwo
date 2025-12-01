# Proving Grounds BBS - Original Features Documentation

Analysis of Apple II disk images from http://software.bbsdocumentary.com/APPLE/II/PROVINGGROUNDS

## Overview

Proving Grounds is a fantasy-themed BBS with RPG elements, featuring:
- Character creation and progression (100 levels)
- User vs User combat
- Monster fighting dungeon
- Text adventures (900 rooms)
- Message boards
- Real-time sysop chat
- Gambling games
- Jousting mini-game
- Castle building/defense system
- Economy system (gold, shops, treasury)

---

## 1. User System

### Character Creation
- New users start at Level 1 as "Low-Life Scum"
- Initial stats: ST=10, AG=10, WI=10, CH=10 (Strength, Agility, Wisdom, Intelligence/Charisma)
- Starting equipment: Dagger (weapon), Cloth (armor)
- Starting gold: 500
- HP: 20, Power: 20, Food: 100

### Character Stats
- **Strength (ST)**: Damage dealt in combat
- **Agility (AG)**: Hit chance, first attack determination
- **Wisdom (WI)**: Spell effectiveness
- **Intelligence/Charisma (CH)**: HP gain on level up
- **Hit Points (HP)**: Health, 0 = death
- **Power (PO)**: Mana for casting spells
- **Food (FD)**: Consumed during adventures
- **Gold (GD)**: Currency
- **Experience (EX)**: Progress toward next level

### Validation Levels
- Half Validated: Limited access
- Validated: Full access including adventures
- Access to certain features requires validation

### User Levels (100 total)
Progression from "Low-Life Scum" through ranks like:
- Maggot, Lout, Vagabond, Rogue, Footpad
- Avenger, Mage, Magsman, Pirate, Klepto
- ...through to...
- Timelord Level 1-49
- Immortal Timelord (max level)

Experience requirements scale exponentially (750 -> 1,500 -> 3,000 -> 6,000...)

---

## 2. Message Boards (BRD.bas)

### Features
- Multiple boards with individual settings
- Board Masters can configure their boards
- New message scanning (quickscan)
- Sequential reading with navigation

### Board Settings
- **Access levels**: Sysop Only, Validated Users Only, All Users, Password Protected
- **Post under**: Real Name, Anonymous, Any Handle
- **Board Master**: Designated user who can moderate

### Commands
- P) Post message
- F) Forward sequential read
- S) Scan message titles
- K) Kill/delete messages (Board Master/Sysop)
- E) Edit board settings (Board Master)
- B) Change board
- N) Next board quickscan
- Q) Quit to main

### Message Posting
- Subject line
- Multi-line message editor with commands:
  - /EX - Exit without saving
  - /S - Save
  - /UP - Redo last line
  - /LN - Show line number
- Anonymous posting option
- Fake name posting option (board configurable)

---

## 3. Combat System (FIGHT.bas)

### Combat Modes

#### A) Proving Grounds - User vs User
- Can fight users within level range (higher or FL levels below)
- Winner gets loser's gold and equipment (if better)
- Death notifications and kill logging
- Leave messages to defeated opponents

#### B) Dungeon - Monster Fighting
- 10 difficulty levels (Easy to Land of the Immortals)
- 200 monsters in database
- Experience and gold rewards
- Random encounters

#### C) Corridor of Death
- 200-room mini-adventure
- Limited escape points (every 20 rooms)
- Magical weapons/armor found in deeper rooms
- Food consumption while exploring
- Resurrect spell functionality
- Trap encounters
- Chest rewards

#### D) Castle Attacks
- Raid other users' castles
- Navigate 19 rooms of defenses
- Steal half of defender's treasury if successful

### Combat Mechanics
- Initiative based on Agility
- Hit chance: (Weapon + Agility) vs (Enemy Weapon + Enemy Agility)
- Damage: (Strength/25 + 1) * Weapon Power
- Armor absorption
- Protection spell stacking

### Spells in Combat
- **Death**: Halves enemy HP
- **Negate**: Disables all magic for the battle
- **Teleport**: Escape from Corridor
- **Resurrect**: Auto-revive on death
- **Protect/Super Protect**: Reduce incoming damage
- **Increase/Super Increase**: Double HP or Power
- **Cure Light/Severe/All Wounds**: Healing
- Plus damage spells: Flaming Arrow, Fireball, Ice Storm, Blizzard, etc.

---

## 4. Stores (STORES.bas)

### Ye Old Battle Shop
- **Buy Weapons**: 100+ weapons from Hands to Sceptre of Might
- **Buy Armor**: Similar progression
- **Buy Spells**: Up to 9 of each spell
- **Sell Equipment**: 50% of purchase price

### Magical Healings (Witch Hilda)
- Restore Hit Points: 50 gold per point
- Restore Power: 50 gold per point

### Ronald's Roach Burgers
- Buy Food: (Level * 2) gold per food unit

### Weapons List (partial)
```
Hands (free) -> Dagger (100) -> Sling (150) -> ...
-> +1 Long Sword (3,610) -> Sword of Sharpness (2,506,000)
-> Sceptre of Might (10,000,000)
```

### Spells List
```
Cure Light Wounds (200), Flaming Arrow (350), Fireball (900)
Cure Severe Wounds (7,500), Magic Missile (2,000), Fireblast (3,500)
Teleport (7,500), Meteor Swarm (8,000), Ice Storm (12,500)
Death (75,000), Negate (32,500), Resurrect (350,000)
Super Increase (250,000), Super Protect (175,000)
```

---

## 5. Jousting (JOUST.bas)

### Gameplay
- Challenge other users to joust
- Best of 5 passes, first to 3 wins
- Skill calculation: (Agility + Strength + Wins - Losses)
- Can only joust users within level range

### Rewards
- Winner gets (Level^2 * 60) gold
- Every 20 wins: All stats +5
- Win/Loss records tracked

### Combat Flavor
- Victory: "The Queen tosses you her handkerchief!"
- Loss: "The Queen frowns as you leave..."
- Crowd reactions (cheers, waves, boos)

---

## 6. Gambling (GA.bas)

### Slot Machines
- 3-wheel, 4-wheel, or 5-wheel variants
- Payouts based on matches:
  - 3-wheel: 2 match = 2.75x, 3 match = 81x
  - 4-wheel: 3 match = 36x, 4 match = 400x
  - 5-wheel: 3 match = 10x, 4 match = 250x, 5 match = 4000x

### Roulette
- Bet on: Number (1-36), Even, Odd, or Sequence
- Number: 36x payout
- Even/Odd: 2x payout
- Sequence: 36/(range) payout

### Blackjack
- Standard rules
- Hit, Stand, Double
- Blackjack pays 1.5x
- Dealer hits on soft 17
- Push (tie) returns bet

### Russian Roulette
- Risk death for (Level^2 * 35 * pulls) gold
- 50% survival rate per pull
- Death = lose all gold

---

## 7. Castle System (CASTLE_EDITOR.bas)

### Castle Structure
- 19 rooms of defense + treasury room (20th)
- Each room can have:
  - Monster (Level 1-10 based on user level)
  - Spell trap (any battle spell)

### Defense Costs (rent per call)
- Monsters: (Level^3 * 100) gold
- Spell Traps: (Spell# ^2 * 100) gold

### Castle Protection
- Must pay rent to keep protection active
- If unpaid, castle protection is OFF
- Treasury can be raided by attackers

### Treasury
- Separate from carried gold
- Deposit/Withdraw anytime
- Protected when castle defense is active
- Half stolen if castle is breached

---

## 8. Text Adventure (ADVENT.bas)

### "Split Infinity" Adventure
- 900+ rooms to explore
- Cardinal direction navigation (N/S/E/W)
- Prelude story and help files

### Features
- Room descriptions and names
- Items to find and use (10 item inventory)
- NPCs to talk to (T) or bribe (B)
- Shops within adventure (weapons, healing, food)
- Chests with treasure/traps
- Force fields requiring passes
- Monster encounters
- Poison status effect

### Special Items
- Box of Teleportation: Set coordinates and warp
- Bottle of Holy Water: 3x HP and Power
- Magic Potion: Cure poison
- Force Field Pass: Pass through barriers
- Thermonuclear Bomb: Special ending

### Commands
- N/S/E/W) Movement
- L) Look
- G) Get item
- D) Drop item
- U) Use item
- I) Inventory
- K) Open chest
- C) Cast spell
- T) Talk
- B) Bribe
- V) Say (for special triggers)
- Z) Equip weapon/armor from inventory
- J) Enter shop
- H) Health status
- Y) Character stats
- F) Toggle brief mode
- O) Leave adventure

---

## 9. Sysop Features (CHAT.bas)

### Chat Mode
- Real-time text chat between sysop and user
- Sysop can interrupt user session

### Sysop Options
1. Change time left
2. Change user level
3. Validate user
4. Chat with user
5. Log off user
6. Enter system level (navigate to any module)
7. Change name/fights remaining
8. Exit sysop options

### User Stats Editor
- Edit all stats: Calls/Day, Total Calls, Adventure Access
- Modify: Strength, Agility, Intelligence, Wisdom
- Adjust: Gold, Food, Experience, HP, Power
- Change: Weapon, Armor

---

## 10. Other Features

### Main Menu Commands
- A) Bazaar/Shopping
- B) Board Access
- C) Chat with Sysop
- D) Dungeon/Fighting
- E) E-mail
- F) Feedback to Sysop
- G) Gambling
- H) Battle Quickscan
- I) Info/Purchase Copy
- J) Play Adventure
- K) Treasury Deposit/Withdraw
- L) The Ladder (Rankings)
- M) Member Listing
- N) News/Updates
- O) Logoff
- P) Print Equipment & Gold
- R) Re-Roll Character
- S) Show Time and Date
- T) Trade Stats
- U) User Message (visible on command line)
- V) Voting Booth
- X) Fees/Mailing Address
- Y) Your Stats
- Z) View Log
- #) View Fight Outcomes
- @) Change Password
- ^) Help File
- *) Control Character Functions
- %) Proving Downs (Joust)
- /) Add a Call (+20 minutes)
- $) Cross Country List
- :) Reset Joust Wins/Losses
- !) Time Slots
- &) Important Facts
- +) Castle Editor
- .) Temple of Training

### Voting Booth
- Weekly topics
- Vote to earn (Level * 100) gold and experience

### Temple of Training
- Pay (Level^2 * 150) gold
- Uses 5 minutes of time
- Raises one stat by 4 points
- Themed instructors (Garret Jax, Allanon, etc.)

### Trade Stats
- Exchange stats at 1.5:1 ratio
- Trade HP for Power at 2:1 or 1:3 ratio

### Time System
- Calls per day limit
- Minutes per call (configurable by time slot)
- Add extra calls for more time
- Time limits enforced throughout

### Ranking System
- Users ranked by combat prowess
- Daily rank recalculation
- View rankings via "The Ladder"

---

## Data Files Reference

### User Data (STATS)
200 bytes per user record containing all character data

### Monsters (MONSTERS)
60 bytes per monster: Name, Strength, Agility, Wisdom, Weapon, Armor, Gold, Spell1, Spell2, HP

### Weapons (WEAPONS)
40 bytes: Name, Price, Power Rating

### Armor (ARMOR)
40 bytes: Name, Price, Protection Rating

### Spells (SPELLS)
Name, Price, Damage (battle spells)

### Boards (BOARDS)
55 bytes: Name, Volume, Messages, Slot, Drive, Post Access, Read Access, Board Master, Post Mode, Password

### Castles (CASTLES)
39 bytes: 19 room configurations (monster level + trap spell each)

---

## Technical Notes

### Screen Width
- 40 columns (Apple II standard)
- Text wrapping at 40 characters

### Modem Support
- 202 modem protocol toggle
- Carrier detect monitoring
- Timeout handling

### File System
- DOS 3.3 random access files
- Volume-based disk switching (multi-disk system)
