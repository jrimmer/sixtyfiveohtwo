// Modern Renderer - Clean, polished UI while maintaining gameplay
import React from 'react';
import { useGameStore } from '../state/gameState';
import { getRoom } from '../engine/dungeon';
import { getSpellsForLevel } from '../engine/spells';
import { GamePhase, SpecialLocationType, Direction } from '../engine/types';

export const ModernRenderer: React.FC = () => {
  const { character, phase } = useGameStore();

  if (phase === GamePhase.Title) {
    return <ModernTitleScreen />;
  }

  if (phase === GamePhase.CharacterCreation) {
    return <CharacterCreation />;
  }

  if (!character) {
    return <ModernTitleScreen />;
  }

  if (phase === GamePhase.Dead) {
    return <DeathScreen />;
  }

  if (phase === GamePhase.Inn) {
    return <InnScreen />;
  }

  if (phase === GamePhase.SpecialLocation) {
    return <LocationScreen />;
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <Header />

        <div className="grid grid-cols-[1fr_300px] gap-6 mt-4">
          {/* Main game area */}
          <div className="space-y-4">
            <ModernDungeonView />
            <MessagePanel />
            <TreasurePrompt />
            {phase === GamePhase.Combat ? <CombatControls /> : <ExplorationControls />}
          </div>

          {/* Side panel */}
          <div className="space-y-4">
            <CharacterPanel />
            <InventoryPanel />
            <SpellPanel />
          </div>
        </div>
      </div>
    </div>
  );
};

const ModernTitleScreen: React.FC = () => {
  const { startNewGame, loadCharacter, getSavedCharacters } = useGameStore();
  const [showLoad, setShowLoad] = React.useState(false);
  const savedChars = getSavedCharacters();

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex flex-col items-center justify-center p-4">
      <div className="text-center mb-12">
        <h1 className="text-6xl font-bold text-amber-500 mb-2 tracking-wider">TELENGARD</h1>
        <p className="text-slate-400">A Classic Dungeon Crawler</p>
        <p className="text-slate-500 text-sm mt-1">Original (C) 1982 Avalon Hill</p>
      </div>

      <div className="space-y-4 w-full max-w-md">
        <button
          onClick={startNewGame}
          className="w-full py-4 px-6 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-lg transition-colors"
        >
          Start New Character
        </button>

        {savedChars.length > 0 && (
          <>
            <button
              onClick={() => setShowLoad(!showLoad)}
              className="w-full py-4 px-6 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-lg transition-colors"
            >
              Load Saved Character
            </button>

            {showLoad && (
              <div className="bg-slate-800 rounded-lg p-4 space-y-2">
                {savedChars.map((name) => (
                  <button
                    key={name}
                    onClick={() => loadCharacter(name)}
                    className="w-full py-2 px-4 bg-slate-700 hover:bg-slate-600 text-left rounded transition-colors"
                  >
                    {name}
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

const CharacterCreation: React.FC = () => {
  const { rolledStats, rollNewStats, acceptStats } = useGameStore();
  const [name, setName] = React.useState('');

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-slate-800 rounded-lg p-8 max-w-md w-full">
        <h2 className="text-2xl font-bold text-amber-500 mb-6">Create Character</h2>

        {rolledStats && (
          <div className="grid grid-cols-2 gap-4 mb-6">
            <StatDisplay label="Strength" value={rolledStats.strength} />
            <StatDisplay label="Constitution" value={rolledStats.constitution} />
            <StatDisplay label="Intelligence" value={rolledStats.intelligence} />
            <StatDisplay label="Dexterity" value={rolledStats.dexterity} />
            <StatDisplay label="Wisdom" value={rolledStats.wisdom} />
            <StatDisplay label="Charisma" value={rolledStats.charisma} />
          </div>
        )}

        <button
          onClick={rollNewStats}
          className="w-full py-2 px-4 bg-slate-700 hover:bg-slate-600 rounded mb-4 transition-colors"
        >
          Reroll Stats
        </button>

        <div className="mb-4">
          <label className="block text-slate-400 mb-2">Character Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value.toUpperCase())}
            maxLength={20}
            className="w-full py-2 px-4 bg-slate-700 rounded text-white"
            placeholder="Enter name..."
          />
        </div>

        <button
          onClick={() => acceptStats(name)}
          disabled={!name.trim() || !rolledStats}
          className="w-full py-3 px-4 bg-amber-600 hover:bg-amber-500 disabled:bg-slate-600 disabled:cursor-not-allowed rounded font-bold transition-colors"
        >
          Begin Adventure
        </button>
      </div>
    </div>
  );
};

const StatDisplay: React.FC<{ label: string; value: number }> = ({ label, value }) => (
  <div className="bg-slate-700 rounded p-3">
    <div className="text-slate-400 text-sm">{label}</div>
    <div className="text-2xl font-bold text-white">{value}</div>
  </div>
);

const Header: React.FC = () => {
  const { character, setRenderMode, saveCharacter } = useGameStore();

  if (!character) return null;

  return (
    <div className="flex justify-between items-center bg-slate-800 rounded-lg p-4">
      <div>
        <h1 className="text-xl font-bold text-amber-500">{character.name}</h1>
        <p className="text-slate-400">
          Level {character.level} | Dungeon Level {character.position.z}
        </p>
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => setRenderMode('ascii' as any)}
          className="px-3 py-1 bg-slate-700 hover:bg-slate-600 rounded text-sm"
        >
          ASCII
        </button>
        <button
          onClick={saveCharacter}
          className="px-3 py-1 bg-amber-600 hover:bg-amber-500 rounded text-sm"
        >
          Save
        </button>
      </div>
    </div>
  );
};

const ModernDungeonView: React.FC = () => {
  const { character, currentMonster, phase } = useGameStore();

  if (!character) return null;

  const room = getRoom(character.position);

  return (
    <div className="bg-slate-800 rounded-lg p-6">
      <div className="relative w-full aspect-square max-w-md mx-auto bg-slate-900 rounded-lg overflow-hidden">
        {/* Room visualization */}
        <svg viewBox="0 0 100 100" className="w-full h-full">
          {/* Floor */}
          <rect x="20" y="20" width="60" height="60" fill="#1e293b" />

          {/* Walls */}
          {room.walls.north && (
            <line x1="20" y1="20" x2="80" y2="20" stroke="#94a3b8" strokeWidth="4" />
          )}
          {room.walls.south && (
            <line x1="20" y1="80" x2="80" y2="80" stroke="#94a3b8" strokeWidth="4" />
          )}
          {room.walls.west && (
            <line x1="20" y1="20" x2="20" y2="80" stroke="#94a3b8" strokeWidth="4" />
          )}
          {room.walls.east && (
            <line x1="80" y1="20" x2="80" y2="80" stroke="#94a3b8" strokeWidth="4" />
          )}

          {/* Openings (doors) */}
          {!room.walls.north && (
            <rect x="45" y="18" width="10" height="4" fill="#334155" />
          )}
          {!room.walls.south && (
            <rect x="45" y="78" width="10" height="4" fill="#334155" />
          )}
          {!room.walls.west && (
            <rect x="18" y="45" width="4" height="10" fill="#334155" />
          )}
          {!room.walls.east && (
            <rect x="78" y="45" width="4" height="10" fill="#334155" />
          )}

          {/* Stairs */}
          {room.hasStairsUp && (
            <text x="65" y="35" fontSize="12" fill="#22c55e">↑</text>
          )}
          {room.hasStairsDown && (
            <text x="65" y="70" fontSize="12" fill="#ef4444">↓</text>
          )}

          {/* Special location */}
          {room.specialType !== SpecialLocationType.None && (
            <SpecialLocationIcon type={room.specialType} />
          )}

          {/* Player */}
          <circle cx="50" cy="50" r="5" fill="#f59e0b" />

          {/* Monster */}
          {phase === GamePhase.Combat && currentMonster && (
            <circle cx="35" cy="50" r="5" fill="#ef4444" />
          )}
        </svg>

        {/* Location label */}
        {room.specialType !== SpecialLocationType.None && (
          <div className="absolute bottom-2 left-0 right-0 text-center text-sm text-amber-400">
            {getLocationName(room.specialType)}
          </div>
        )}
      </div>

      {/* Coordinates */}
      <div className="text-center mt-4 text-slate-400">
        Position: ({character.position.x}, {character.position.y}) Level {character.position.z}
      </div>
    </div>
  );
};

const SpecialLocationIcon: React.FC<{ type: SpecialLocationType }> = ({ type }) => {
  const icons: Record<SpecialLocationType, string> = {
    [SpecialLocationType.None]: '',
    [SpecialLocationType.Inn]: '🏨',
    [SpecialLocationType.Elevator]: '⬇️',
    [SpecialLocationType.Pit]: '🕳️',
    [SpecialLocationType.Teleporter]: '✨',
    [SpecialLocationType.Stairs]: '🪜',
    [SpecialLocationType.Altar]: '⛪',
    [SpecialLocationType.Fountain]: '⛲',
    [SpecialLocationType.GrayCube]: '🔮',
    [SpecialLocationType.Throne]: '👑',
    [SpecialLocationType.Safe]: '🔐',
  };

  return (
    <text x="50" y="40" fontSize="16" textAnchor="middle">{icons[type]}</text>
  );
};

function getLocationName(type: SpecialLocationType): string {
  const names: Record<SpecialLocationType, string> = {
    [SpecialLocationType.None]: '',
    [SpecialLocationType.Inn]: 'Inn',
    [SpecialLocationType.Elevator]: 'Elevator',
    [SpecialLocationType.Pit]: 'Pit',
    [SpecialLocationType.Teleporter]: 'Teleporter',
    [SpecialLocationType.Stairs]: 'Stairs',
    [SpecialLocationType.Altar]: 'Altar',
    [SpecialLocationType.Fountain]: 'Fountain',
    [SpecialLocationType.GrayCube]: 'Gray Cube',
    [SpecialLocationType.Throne]: 'Throne',
    [SpecialLocationType.Safe]: 'Safe',
  };
  return names[type];
}

const MessagePanel: React.FC = () => {
  const { messages } = useGameStore();
  const recentMessages = messages.slice(-8);

  return (
    <div className="bg-slate-800 rounded-lg p-4 h-48 overflow-y-auto">
      {recentMessages.map((msg, i) => (
        <div
          key={i}
          className={`py-1 ${
            msg.type === 'danger' ? 'text-red-400' :
            msg.type === 'magic' ? 'text-cyan-400' :
            msg.type === 'treasure' ? 'text-yellow-400' :
            msg.type === 'combat' ? 'text-orange-400' :
            'text-slate-300'
          }`}
        >
          {msg.text}
        </div>
      ))}
    </div>
  );
};

const ExplorationControls: React.FC = () => {
  const { move, useStairs, character } = useGameStore();

  if (!character) return null;

  const room = getRoom(character.position);

  return (
    <div className="bg-slate-800 rounded-lg p-4">
      <div className="grid grid-cols-3 gap-2 max-w-xs mx-auto">
        <div />
        <button
          onClick={() => move(Direction.North)}
          className="py-3 px-4 bg-slate-700 hover:bg-slate-600 rounded font-bold"
        >
          N
        </button>
        <div />
        <button
          onClick={() => move(Direction.West)}
          className="py-3 px-4 bg-slate-700 hover:bg-slate-600 rounded font-bold"
        >
          W
        </button>
        <div className="py-3 px-4 bg-slate-900 rounded text-center text-slate-500">@</div>
        <button
          onClick={() => move(Direction.East)}
          className="py-3 px-4 bg-slate-700 hover:bg-slate-600 rounded font-bold"
        >
          E
        </button>
        <div />
        <button
          onClick={() => move(Direction.South)}
          className="py-3 px-4 bg-slate-700 hover:bg-slate-600 rounded font-bold"
        >
          S
        </button>
        <div />
      </div>

      {(room.hasStairsUp || room.hasStairsDown) && (
        <div className="flex justify-center gap-2 mt-4">
          {room.hasStairsUp && (
            <button
              onClick={() => useStairs('up')}
              className="py-2 px-4 bg-green-700 hover:bg-green-600 rounded"
            >
              ↑ Up
            </button>
          )}
          {room.hasStairsDown && (
            <button
              onClick={() => useStairs('down')}
              className="py-2 px-4 bg-red-700 hover:bg-red-600 rounded"
            >
              ↓ Down
            </button>
          )}
        </div>
      )}
    </div>
  );
};

const CombatControls: React.FC = () => {
  const { fight, evade, currentMonster, toggleSpellList } = useGameStore();

  if (!currentMonster) return null;

  return (
    <div className="bg-slate-800 rounded-lg p-4">
      <div className="text-center mb-4">
        <span className="text-red-400 font-bold">COMBAT: </span>
        <span className="text-white">LVL {currentMonster.level} {currentMonster.name}</span>
        <span className="text-slate-400 ml-2">(HP: {currentMonster.currentHp})</span>
      </div>

      <div className="flex justify-center gap-4">
        <button
          onClick={fight}
          className="py-3 px-6 bg-red-700 hover:bg-red-600 rounded font-bold"
        >
          Fight
        </button>
        <button
          onClick={toggleSpellList}
          className="py-3 px-6 bg-cyan-700 hover:bg-cyan-600 rounded font-bold"
        >
          Cast
        </button>
        <button
          onClick={evade}
          className="py-3 px-6 bg-slate-700 hover:bg-slate-600 rounded font-bold"
        >
          Evade
        </button>
      </div>
    </div>
  );
};

const CharacterPanel: React.FC = () => {
  const { character } = useGameStore();

  if (!character) return null;

  return (
    <div className="bg-slate-800 rounded-lg p-4">
      <h3 className="text-lg font-bold text-amber-500 mb-3">Stats</h3>

      <div className="grid grid-cols-2 gap-2 text-sm">
        <div className="flex justify-between">
          <span className="text-slate-400">STR</span>
          <span>{character.stats.strength}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">CON</span>
          <span>{character.stats.constitution}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">INT</span>
          <span>{character.stats.intelligence}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">DEX</span>
          <span>{character.stats.dexterity}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">WIS</span>
          <span>{character.stats.wisdom}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">CHR</span>
          <span>{character.stats.charisma}</span>
        </div>
      </div>

      <div className="border-t border-slate-700 my-3" />

      {/* HP Bar */}
      <div className="mb-2">
        <div className="flex justify-between text-sm mb-1">
          <span className="text-red-400">HP</span>
          <span>{character.currentHp}/{character.maxHp}</span>
        </div>
        <div className="bg-slate-700 rounded-full h-2">
          <div
            className="bg-red-500 rounded-full h-2 transition-all"
            style={{ width: `${(character.currentHp / character.maxHp) * 100}%` }}
          />
        </div>
      </div>

      {/* Spell Units Bar */}
      <div className="mb-2">
        <div className="flex justify-between text-sm mb-1">
          <span className="text-cyan-400">Spells</span>
          <span>{character.spellUnits}/{character.maxSpellUnits}</span>
        </div>
        <div className="bg-slate-700 rounded-full h-2">
          <div
            className="bg-cyan-500 rounded-full h-2 transition-all"
            style={{ width: `${(character.spellUnits / character.maxSpellUnits) * 100}%` }}
          />
        </div>
      </div>

      <div className="flex justify-between text-sm">
        <span className="text-yellow-400">Gold</span>
        <span>{character.gold}</span>
      </div>
      <div className="flex justify-between text-sm">
        <span className="text-slate-400">Experience</span>
        <span>{character.experience}</span>
      </div>
    </div>
  );
};

const InventoryPanel: React.FC = () => {
  const { character, useScroll, useHealingPotion, useStrengthPotion } = useGameStore();

  if (!character) return null;

  const inv = character.inventory;

  return (
    <div className="bg-slate-800 rounded-lg p-4">
      <h3 className="text-lg font-bold text-amber-500 mb-3">Equipment</h3>

      <div className="space-y-1 text-sm">
        {inv.sword !== 0 && <div>Sword +{inv.sword}</div>}
        {inv.armor !== 0 && <div>Armor +{inv.armor}</div>}
        {inv.shield !== 0 && <div>Shield +{inv.shield}</div>}
        {inv.elvenCloak > 0 && <div>Elven Cloak +{inv.elvenCloak}</div>}
        {inv.elvenBoots > 0 && <div>Elven Boots +{inv.elvenBoots}</div>}
        {inv.ringOfRegeneration > 0 && <div>Ring of Regen +{inv.ringOfRegeneration}</div>}
        {inv.ringOfProtection > 0 && <div>Ring of Prot +{inv.ringOfProtection}</div>}
      </div>

      {(inv.scrollOfRescue > 0 || inv.potionOfHealing > 0 || inv.potionOfStrength > 0) && (
        <>
          <div className="border-t border-slate-700 my-3" />
          <h4 className="text-sm font-bold text-slate-400 mb-2">Consumables</h4>
          <div className="space-y-2">
            {inv.scrollOfRescue > 0 && (
              <button
                onClick={useScroll}
                className="w-full text-left py-1 px-2 bg-slate-700 hover:bg-slate-600 rounded text-sm"
              >
                Scroll of Rescue ({inv.scrollOfRescue})
              </button>
            )}
            {inv.potionOfHealing > 0 && (
              <button
                onClick={useHealingPotion}
                className="w-full text-left py-1 px-2 bg-slate-700 hover:bg-slate-600 rounded text-sm"
              >
                Potion of Healing ({inv.potionOfHealing})
              </button>
            )}
            {inv.potionOfStrength > 0 && (
              <button
                onClick={useStrengthPotion}
                className="w-full text-left py-1 px-2 bg-slate-700 hover:bg-slate-600 rounded text-sm"
              >
                Potion of Strength ({inv.potionOfStrength})
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
};

const SpellPanel: React.FC = () => {
  const { character, showSpellList, selectedSpellLevel, setSelectedSpellLevel, castSpellAction, toggleSpellList } = useGameStore();

  if (!character || !showSpellList) return null;

  const maxLevel = Math.min(Math.floor(character.level / 3) + 1, 6);
  const spells = getSpellsForLevel(selectedSpellLevel);

  return (
    <div className="bg-slate-800 rounded-lg p-4">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-lg font-bold text-cyan-400">Spells</h3>
        <button onClick={toggleSpellList} className="text-slate-400 hover:text-white">✕</button>
      </div>

      {/* Level selector */}
      <div className="flex gap-1 mb-3">
        {[1, 2, 3, 4, 5, 6].map((lvl) => (
          <button
            key={lvl}
            onClick={() => setSelectedSpellLevel(lvl)}
            disabled={lvl > maxLevel}
            className={`px-2 py-1 rounded text-sm ${
              lvl === selectedSpellLevel
                ? 'bg-cyan-600'
                : lvl <= maxLevel
                ? 'bg-slate-700 hover:bg-slate-600'
                : 'bg-slate-800 text-slate-600 cursor-not-allowed'
            }`}
          >
            {lvl}
          </button>
        ))}
      </div>

      {/* Spell list */}
      <div className="space-y-1">
        {spells.map((spell) => (
          <button
            key={spell.id}
            onClick={() => castSpellAction(spell.level, spell.slot)}
            disabled={character.spellUnits < spell.level}
            className={`w-full text-left py-1 px-2 rounded text-sm ${
              character.spellUnits >= spell.level
                ? 'bg-slate-700 hover:bg-slate-600'
                : 'bg-slate-800 text-slate-600 cursor-not-allowed'
            }`}
          >
            {spell.slot}. {spell.name}
          </button>
        ))}
      </div>
    </div>
  );
};

const InnScreen: React.FC = () => {
  const { character, leaveInn, saveCharacter } = useGameStore();

  if (!character) return null;

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-slate-800 rounded-lg p-8 max-w-md w-full text-center">
        <h2 className="text-2xl font-bold text-amber-500 mb-4">The Inn</h2>
        <p className="text-slate-300 mb-2">You cash in your gold to experience.</p>
        <p className="text-slate-300 mb-2">You now have {character.bankGold + character.gold} in the safe here.</p>
        <p className="text-slate-300 mb-6">You spend the night and feel better!</p>

        <div className="space-y-3">
          <button
            onClick={saveCharacter}
            className="w-full py-3 px-4 bg-amber-600 hover:bg-amber-500 rounded font-bold"
          >
            Save Character
          </button>
          <button
            onClick={leaveInn}
            className="w-full py-3 px-4 bg-slate-700 hover:bg-slate-600 rounded"
          >
            Return to Dungeon
          </button>
        </div>
      </div>
    </div>
  );
};

const DeathScreen: React.FC = () => {
  const { character, startNewGame, initGame } = useGameStore();

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-slate-800 rounded-lg p-8 max-w-md w-full text-center">
        <h2 className="text-3xl font-bold text-red-500 mb-4">YOU DIED</h2>
        {character && character.level < 4 ? (
          <p className="text-slate-300 mb-6">Another not so mighty adventurer bites the dust.</p>
        ) : (
          <p className="text-slate-300 mb-6">Another mighty adventurer bites the dust.</p>
        )}

        <button
          onClick={() => { initGame(); startNewGame(); }}
          className="py-3 px-6 bg-amber-600 hover:bg-amber-500 rounded font-bold"
        >
          Try Again
        </button>
      </div>
    </div>
  );
};

// ==================== LOCATION SCREENS ====================

const LocationScreen: React.FC = () => {
  const { currentLocation } = useGameStore();

  switch (currentLocation) {
    case SpecialLocationType.Altar:
      return <AltarScreen />;
    case SpecialLocationType.Fountain:
      return <FountainScreen />;
    case SpecialLocationType.Throne:
      return <ThroneScreen />;
    case SpecialLocationType.GrayCube:
      return <GrayCubeScreen />;
    case SpecialLocationType.Pit:
      return <PitScreen />;
    case SpecialLocationType.Safe:
      return <SafeScreen />;
    case SpecialLocationType.Stairs:
      return <StairsScreen />;
    default:
      return <GenericLocationScreen />;
  }
};

const AltarScreen: React.FC = () => {
  const { character, handleAltarDonation, ignoreLocation } = useGameStore();
  const [donation, setDonation] = React.useState('');

  if (!character) return null;

  const suggestedAmount = 50 * character.position.z;

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-slate-800 rounded-lg p-8 max-w-md w-full">
        <h2 className="text-2xl font-bold text-cyan-400 mb-4 text-center">Holy Altar</h2>
        <p className="text-slate-300 mb-2">You have found a holy altar.</p>
        <p className="text-slate-300 mb-2">Your gold: <span className="text-yellow-400">{character.gold}</span></p>
        <p className="text-amber-400 mb-6">Suggested offering: {suggestedAmount}+ gold</p>

        <div className="space-y-4">
          <div>
            <label className="block text-slate-400 mb-2">Donation Amount</label>
            <input
              type="number"
              value={donation}
              onChange={(e) => setDonation(e.target.value)}
              min="0"
              max={character.gold}
              className="w-full py-2 px-4 bg-slate-700 rounded text-white"
              placeholder="Enter amount..."
            />
          </div>
          <button
            onClick={() => handleAltarDonation(parseInt(donation) || 0)}
            className="w-full py-3 px-4 bg-cyan-600 hover:bg-cyan-500 rounded font-bold"
          >
            Worship & Donate
          </button>
          <button
            onClick={ignoreLocation}
            className="w-full py-3 px-4 bg-slate-700 hover:bg-slate-600 rounded"
          >
            Leave
          </button>
        </div>
      </div>
    </div>
  );
};

const FountainScreen: React.FC = () => {
  const { handleFountainDrink, ignoreLocation, messages } = useGameStore();
  const lastMsg = messages[messages.length - 1]?.text || '';
  const colorMatch = lastMsg.match(/running (\w+) water/i);
  const color = colorMatch ? colorMatch[1] : 'mysterious';

  const colorClasses: Record<string, string> = {
    white: 'text-white',
    green: 'text-green-400',
    clear: 'text-blue-300',
    red: 'text-red-400',
    black: 'text-slate-400',
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-slate-800 rounded-lg p-8 max-w-md w-full text-center">
        <h2 className="text-2xl font-bold text-cyan-400 mb-4">Fountain</h2>
        <p className="text-slate-300 mb-4">
          You have found a fountain with running{' '}
          <span className={colorClasses[color.toLowerCase()] || 'text-cyan-400'}>{color.toUpperCase()}</span> water.
        </p>
        <p className="text-amber-400 mb-6">Warning: Effects may vary!</p>

        <div className="space-y-3">
          <button
            onClick={handleFountainDrink}
            className="w-full py-3 px-4 bg-cyan-600 hover:bg-cyan-500 rounded font-bold"
          >
            Drink
          </button>
          <button
            onClick={ignoreLocation}
            className="w-full py-3 px-4 bg-slate-700 hover:bg-slate-600 rounded"
          >
            Leave
          </button>
        </div>
      </div>
    </div>
  );
};

const ThroneScreen: React.FC = () => {
  const { handleThroneAction } = useGameStore();

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-slate-800 rounded-lg p-8 max-w-md w-full text-center">
        <h2 className="text-2xl font-bold text-yellow-400 mb-4">Jewel Encrusted Throne</h2>
        <p className="text-slate-300 mb-4">You see a magnificent throne covered in jewels.</p>
        <p className="text-red-400 mb-6">Warning: The MONSTER KING may return!</p>

        <div className="space-y-3">
          <button
            onClick={() => handleThroneAction('pry')}
            className="w-full py-3 px-4 bg-yellow-600 hover:bg-yellow-500 rounded font-bold"
          >
            Pry Jewels
          </button>
          <button
            onClick={() => handleThroneAction('sit')}
            className="w-full py-3 px-4 bg-purple-600 hover:bg-purple-500 rounded font-bold"
          >
            Sit Down
          </button>
          <button
            onClick={() => handleThroneAction('read')}
            className="w-full py-3 px-4 bg-cyan-600 hover:bg-cyan-500 rounded font-bold"
          >
            Read Runes
          </button>
          <button
            onClick={() => handleThroneAction('ignore')}
            className="w-full py-3 px-4 bg-slate-700 hover:bg-slate-600 rounded"
          >
            Leave
          </button>
        </div>
      </div>
    </div>
  );
};

const GrayCubeScreen: React.FC = () => {
  const { handleGrayCubeLevel, ignoreLocation } = useGameStore();
  const [level, setLevel] = React.useState('');

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-slate-800 rounded-lg p-8 max-w-md w-full">
        <h2 className="text-2xl font-bold text-purple-400 mb-4 text-center">Gray Cube</h2>
        <p className="text-slate-300 mb-4 text-center">You see a large gray misty cube.</p>
        <p className="text-purple-400 mb-6 text-center">Enter to warp to any dungeon level (1-50).</p>

        <div className="space-y-4">
          <div>
            <label className="block text-slate-400 mb-2">Target Level (blank = random)</label>
            <input
              type="number"
              value={level}
              onChange={(e) => setLevel(e.target.value)}
              min="1"
              max="50"
              className="w-full py-2 px-4 bg-slate-700 rounded text-white"
              placeholder="Random"
            />
          </div>
          <button
            onClick={() => handleGrayCubeLevel(level ? parseInt(level) : null)}
            className="w-full py-3 px-4 bg-purple-600 hover:bg-purple-500 rounded font-bold"
          >
            Enter Cube
          </button>
          <button
            onClick={ignoreLocation}
            className="w-full py-3 px-4 bg-slate-700 hover:bg-slate-600 rounded"
          >
            Leave
          </button>
        </div>
      </div>
    </div>
  );
};

const PitScreen: React.FC = () => {
  const { character, handlePitChoice } = useGameStore();

  if (!character) return null;

  const isLevitating = character.spellEffects.levitate > 0;

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-slate-800 rounded-lg p-8 max-w-md w-full text-center">
        <h2 className="text-2xl font-bold text-red-400 mb-4">Pit</h2>
        {isLevitating ? (
          <p className="text-cyan-400 mb-4">You are hovering over a pit.</p>
        ) : (
          <p className="text-slate-300 mb-4">You see a pit. You managed to stop at the edge!</p>
        )}
        <p className="text-slate-400 mb-4">Current level: {character.position.z}</p>
        {!isLevitating && (
          <p className="text-amber-400 mb-6">Warning: Descending may cause damage!</p>
        )}

        <div className="space-y-3">
          <button
            onClick={() => handlePitChoice(true)}
            className="w-full py-3 px-4 bg-red-600 hover:bg-red-500 rounded font-bold"
          >
            Descend
          </button>
          <button
            onClick={() => handlePitChoice(false)}
            className="w-full py-3 px-4 bg-slate-700 hover:bg-slate-600 rounded"
          >
            Stay
          </button>
        </div>
      </div>
    </div>
  );
};

const SafeScreen: React.FC = () => {
  const { safeState, handleSafeButton, ignoreLocation } = useGameStore();

  if (!safeState) return null;

  const colors = [
    { name: 'Red', bg: 'bg-red-600 hover:bg-red-500' },
    { name: 'Green', bg: 'bg-green-600 hover:bg-green-500' },
    { name: 'Yellow', bg: 'bg-yellow-500 hover:bg-yellow-400' },
    { name: 'Blue', bg: 'bg-blue-600 hover:bg-blue-500' },
  ];

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-slate-800 rounded-lg p-8 max-w-md w-full text-center">
        <h2 className="text-2xl font-bold text-yellow-400 mb-4">Safe</h2>
        <p className="text-slate-300 mb-2">You see a small box with four colored buttons.</p>
        <p className="text-slate-400 mb-4">Progress: {safeState.currentPosition - 1}/4 correct</p>
        <p className="text-red-400 mb-6">Wrong guesses cause damage!</p>

        <div className="grid grid-cols-2 gap-3 mb-6">
          {colors.map((color, idx) => (
            <button
              key={color.name}
              onClick={() => handleSafeButton(idx + 1)}
              className={`py-4 px-4 ${color.bg} rounded font-bold text-white`}
            >
              {color.name}
            </button>
          ))}
        </div>

        <button
          onClick={ignoreLocation}
          className="w-full py-3 px-4 bg-slate-700 hover:bg-slate-600 rounded"
        >
          Leave
        </button>
      </div>
    </div>
  );
};

const StairsScreen: React.FC = () => {
  const { character, handleLocationChoice } = useGameStore();

  if (!character) return null;

  const canGoUp = character.position.z > 1;
  const canGoDown = character.position.z < 50;

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-slate-800 rounded-lg p-8 max-w-md w-full text-center">
        <h2 className="text-2xl font-bold text-amber-400 mb-4">Stairway</h2>
        <p className="text-slate-300 mb-4">You found a circular stairway.</p>
        <p className="text-slate-400 mb-4">Current level: {character.position.z}</p>
        {character.position.z === 1 && canGoUp && (
          <p className="text-yellow-400 mb-6">You see LIGHT above!</p>
        )}

        <div className="space-y-3">
          {canGoUp && (
            <button
              onClick={() => handleLocationChoice('up')}
              className="w-full py-3 px-4 bg-green-600 hover:bg-green-500 rounded font-bold"
            >
              Go Up
            </button>
          )}
          {canGoDown && (
            <button
              onClick={() => handleLocationChoice('down')}
              className="w-full py-3 px-4 bg-red-600 hover:bg-red-500 rounded font-bold"
            >
              Go Down
            </button>
          )}
          <button
            onClick={() => handleLocationChoice('stay')}
            className="w-full py-3 px-4 bg-slate-700 hover:bg-slate-600 rounded"
          >
            Stay
          </button>
        </div>
      </div>
    </div>
  );
};

const GenericLocationScreen: React.FC = () => {
  const { ignoreLocation, messages } = useGameStore();
  const lastMsg = messages[messages.length - 1]?.text || 'You found something...';

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-slate-800 rounded-lg p-8 max-w-md w-full text-center">
        <p className="text-slate-300 mb-6">{lastMsg}</p>
        <button
          onClick={ignoreLocation}
          className="w-full py-3 px-4 bg-slate-700 hover:bg-slate-600 rounded"
        >
          Continue
        </button>
      </div>
    </div>
  );
};

// ==================== TREASURE PROMPT ====================

const TreasurePrompt: React.FC = () => {
  const { pendingTreasure, handleTreasurePickup, ignoreTreasure } = useGameStore();

  if (!pendingTreasure) return null;

  return (
    <div className="bg-yellow-900/50 border border-yellow-500 rounded-lg p-4">
      <p className="text-yellow-400 mb-3">
        {pendingTreasure.isChest ? 'You found a treasure chest! Open it?' : 'You found some treasure! Pick it up?'}
      </p>
      <div className="flex gap-3">
        <button
          onClick={handleTreasurePickup}
          className="flex-1 py-2 px-4 bg-yellow-600 hover:bg-yellow-500 rounded font-bold"
        >
          Yes
        </button>
        <button
          onClick={ignoreTreasure}
          className="flex-1 py-2 px-4 bg-slate-700 hover:bg-slate-600 rounded"
        >
          No
        </button>
      </div>
    </div>
  );
};

export default ModernRenderer;
