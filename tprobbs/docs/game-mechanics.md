# Game Mechanics

All formulas are faithfully ported from the original AppleSoft BASIC source code.

## Combat System

### Damage Calculation

```javascript
// Base damage formula
let damage = (4 * weaponLevel + level + stamina / 10 - targetArmor) / 2;

// Add randomness
damage = damage + Math.random() * (Math.abs(damage) + 1);
```

**Factors:**
- Higher weapon level = more damage
- Higher player level = more damage
- Higher stamina = slightly more damage
- Target armor reduces damage
- Random variance ensures unpredictable outcomes

### Hit Chance

Combat hits are determined by comparing attacker stats against defender stats, with random elements for excitement.

## Experience Points

### XP Required for Level Up

```javascript
// Higher intellect = MORE XP needed (tradeoff for spell power)
const xpRequired = Math.pow(2, level + 1) * (1100 + intellect * 2);
```

**Example XP requirements (intellect = 50):**

| Level | XP Required |
|-------|-------------|
| 1 | 4,800 |
| 2 | 9,600 |
| 3 | 19,200 |
| 5 | 76,800 |
| 10 | 2,457,600 |

### Monster XP Reward

```javascript
// Deeper dungeon levels = more XP
const xp = Math.pow(2, dungeonLevel + 2) * 1000 / 15;
```

**XP by dungeon level:**

| Dungeon Level | XP per Kill |
|---------------|-------------|
| 1 | ~533 |
| 2 | ~1,067 |
| 3 | ~2,133 |
| 5 | ~8,533 |
| 10 | ~273,067 |

## Economy

### Sell Price Formula

```javascript
// Charisma affects sell prices
const sellPrice = itemPrice * (50 + charisma / 2) / 100;
```

**Sell percentage by charisma:**

| Charisma | Sell % |
|----------|--------|
| 0 | 50% |
| 50 | 75% |
| 100 | 100% |

### Bank Interest

Gold stored in the bank may earn interest over time (configurable by sysop).

## Character Stats

### Primary Attributes

| Stat | Effect |
|------|--------|
| **Strength** | Physical attack power |
| **Stamina** | HP pool, damage bonus |
| **Intellect** | Spell power, XP penalty |
| **Charisma** | Shop prices, social interactions |

### Derived Stats

| Stat | Formula |
|------|---------|
| **HP** | Base + Stamina bonus |
| **SP** | Base + Intellect bonus |
| **Max HP** | Level-based with Stamina modifier |

## Character Classes

Each class has different stat distributions and abilities:

| Class | Strengths | Playstyle |
|-------|-----------|-----------|
| **Warrior** | Strength, Stamina | Melee combat |
| **Mage** | Intellect | Spell casting |
| **Thief** | Charisma | Economy, stealth |
| **Barbarian** | Strength | Raw damage |
| **Paladin** | Balanced | Hybrid fighter |
| **Ranger** | Balanced | Ranged combat |

## Dungeon System

### Monster Scaling

Monsters are selected based on dungeon level. Deeper levels spawn stronger monsters with better rewards.

### Room Navigation

- **Move Forward** - Explore current level
- **Go Deeper** - Descend to harder (more rewarding) levels
- **Leave Dungeon** - Return to safety

### Death

When HP reaches 0:
- Player is returned to town
- Gold may be lost
- XP is preserved
- Visit the healer to restore HP

## Casino Games

### Slots

Three-reel slot machine with symbol payouts:
- Matching symbols pay increasing amounts
- Special jackpot combinations

### Blackjack

Standard blackjack rules:
- Beat dealer without exceeding 21
- Face cards = 10, Ace = 1 or 11

### Craps

Dice game with pass/don't pass betting.

### High-Low

Guess if next card is higher or lower than current.

## Gang System

Players can form gangs for:
- Shared resources
- Gang wars
- Leaderboards
- Social features
