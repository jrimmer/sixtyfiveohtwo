// ASCII Renderer - Classic text-mode display mimicking the original Apple II
import React from 'react';
import { useGameStore } from '../state/gameState';
import { getRoom, generateInnName } from '../engine/dungeon';
import { GamePhase, SpecialLocationType, FountainColor } from '../engine/types';
import type { GameMessage, Character, Monster, SafeState } from '../engine/types';

export const AsciiRenderer: React.FC = () => {
  // All hooks must be called before any conditional returns
  const {
    character,
    currentMonster,
    phase,
    messages,
    pendingTreasure,
    currentLocation,
    fountainColor,
    safeState,
  } = useGameStore();

  if (phase === GamePhase.Title) {
    return <TitleScreen />;
  }

  if (phase === GamePhase.CharacterCreation) {
    return <CharacterCreationScreen />;
  }

  if (!character) {
    return <TitleScreen />;
  }

  // Inn, Dead, and other phases are handled inline in AppleIIScreen

  // Apple II style: 40 columns, 24 rows, centered display, WHITE on BLACK
  return (
    <div className="font-mono bg-black min-h-screen flex items-center justify-center relative">
      <pre className="text-white text-sm leading-none" style={{ fontFamily: '"Apple2", "Courier New", monospace', letterSpacing: '0' }}>
        <AppleIIScreen
          character={character}
          currentMonster={currentMonster}
          phase={phase}
          messages={messages}
          pendingTreasure={pendingTreasure}
          currentLocation={currentLocation}
          fountainColor={fountainColor}
          safeState={safeState}
        />
      </pre>
      {/* Position display - outside game screen, bottom right of window */}
      <div className="fixed bottom-2 right-2 text-gray-500 text-xs font-mono">
        X={character.position.x} Y={character.position.y} LVL={character.position.z}
      </div>
    </div>
  );
};

// Apple II style 40x24 screen - matches original Telengard layout
const AppleIIScreen: React.FC<{
  character: Character;
  currentMonster: Monster | null;
  phase: GamePhase;
  messages: GameMessage[];
  pendingTreasure: { isChest: boolean; isTrapped: boolean } | null;
  currentLocation: SpecialLocationType;
  fountainColor: FountainColor | null;
  safeState: SafeState | null;
}> = ({ character, currentMonster, phase, messages, pendingTreasure, currentLocation, fountainColor, safeState }) => {
  // Build 40-column screen buffer (24 rows)
  const screen: string[][] = [];
  for (let i = 0; i < 24; i++) {
    screen.push(new Array(40).fill(' '));
  }

  // Generate top-down dungeon map (left side, columns 0-22, rows 0-16)
  renderDungeonView(screen, character, currentMonster, phase);

  // Generate status panel (right side, columns 23-39, rows 0-16)
  renderStatusPanel(screen, character);

  // Combat info box (bottom right, if in combat)
  if (phase === GamePhase.Combat && currentMonster) {
    renderCombatBox(screen, currentMonster);
  }

  // Message area and prompts (rows 17-23)
  if (phase === GamePhase.Dead) {
    // Death screen - inline like original
    // Show last few messages (death cause) with word wrap
    const recentMessages = messages.slice(-2);
    let msgRow = 17;
    for (const msg of recentMessages) {
      const wrapped = wordWrap(msg.text, 40);
      for (const line of wrapped) {
        if (msgRow < 20) {
          writeText(screen, 0, msgRow, line);
          msgRow++;
        }
      }
    }
    writeText(screen, 0, 20, '***  YOU DIED  ***');
    if (character.level < 4) {
      writeText(screen, 0, 21, 'ANOTHER NOT SO MIGHTY ADVENTURER');
    } else {
      writeText(screen, 0, 21, 'ANOTHER MIGHTY ADVENTURER');
    }
    writeText(screen, 0, 22, 'BITES THE DUST.');
    writeText(screen, 0, 23, '(T)RY AGAIN:');
  } else if (phase === GamePhase.Inn) {
    // Inn prompts - inline like original
    const innName = generateInnName(character.position.x, character.position.y);
    writeText(screen, 0, 17, 'YOU HAVE FOUND THE');
    writeText(screen, 0, 18, innName + '!!!!');
    writeText(screen, 0, 19, `GOLD CONVERTED TO EXP`);
    writeText(screen, 0, 20, 'HP & SPELLS RESTORED');
    // Show last message (e.g., "HERO saved.") with word wrap
    const lastMsg = messages[messages.length - 1];
    if (lastMsg) {
      const wrapped = wordWrap(lastMsg.text, 40);
      writeText(screen, 0, 21, wrapped[0] || '');
    } else {
      writeText(screen, 0, 21, `BANK BALANCE: ${character.bankGold} GOLD`);
    }
    writeText(screen, 0, 23, '(S)AVE OR (L)EAVE:');
  } else if (phase === GamePhase.SpecialLocation) {
    // Location-specific prompts - inline like original
    renderLocationPrompt(screen, currentLocation, fountainColor, safeState);
  } else {
    // Command prompt and messages (rows 17-21)
    // Word wrap messages to fit 40 columns, show most recent that fit
    const allWrappedLines: string[] = [];
    for (const msg of messages) {
      const wrapped = wordWrap(msg.text, 40);
      allWrappedLines.push(...wrapped);
    }
    // Show last 5 lines (rows 17-21)
    const recentLines = allWrappedLines.slice(-5);
    let msgRow = 17;
    for (const line of recentLines) {
      if (msgRow < 22) {
        writeText(screen, 0, msgRow, line);
        msgRow++;
      }
    }

    // Get current room for stairs info
    const currentRoom = getRoom(character.position);

    // Command prompt (row 22-23)
    if (phase === GamePhase.Combat) {
      writeText(screen, 0, 23, '(F)IGHT, (C)AST, OR (E)VADE:');
    } else if (pendingTreasure) {
      writeText(screen, 0, 23, '<RET> TO PICK IT UP:');
    } else {
      // Show stairs hint if present
      if (currentRoom.hasStairsUp && currentRoom.hasStairsDown) {
        writeText(screen, 0, 22, 'STAIRS: (<)UP  (>)DOWN');
      } else if (currentRoom.hasStairsUp) {
        writeText(screen, 0, 22, 'STAIRS UP: PRESS <');
      } else if (currentRoom.hasStairsDown) {
        writeText(screen, 0, 22, 'STAIRS DOWN: PRESS >');
      }
      writeText(screen, 0, 23, '->');
    }
  }

  // Convert screen buffer to string
  return <>{screen.map(row => row.join('')).join('\n')}</>;
};

// Render location-specific prompts (like original Telengard text prompts)
function renderLocationPrompt(
  screen: string[][],
  location: SpecialLocationType,
  fountainColor: FountainColor | null,
  safeState: SafeState | null
) {
  switch (location) {
    case SpecialLocationType.Pit:
      writeText(screen, 0, 19, 'YOU SEE A PIT');
      writeText(screen, 0, 20, 'DO YOU WANT TO DESCEND?');
      writeText(screen, 0, 22, '(D)ESCEND, (S)TAY, OR (I)GNORE:');
      break;

    case SpecialLocationType.Altar:
      writeText(screen, 0, 19, 'YOU HAVE FOUND A HOLY ALTAR');
      writeText(screen, 0, 20, 'PRESS <RET> TO WORSHIP');
      writeText(screen, 0, 22, '(W)ORSHIP OR (I)GNORE:');
      break;

    case SpecialLocationType.Fountain:
      writeText(screen, 0, 19, 'YOU HAVE FOUND A FOUNTAIN');
      const colorNames = ['WHITE', 'GREEN', 'CLEAR', 'RED', 'BLACK'];
      const colorName = fountainColor !== null && fountainColor >= 0 && fountainColor < colorNames.length
        ? colorNames[fountainColor]
        : 'STRANGE';
      writeText(screen, 0, 20, `WITH RUNNING ${colorName} WATER`);
      writeText(screen, 0, 22, '(D)RINK OR (I)GNORE:');
      break;

    case SpecialLocationType.Throne:
      writeText(screen, 0, 18, 'YOU SEE A JEWEL ENCRUSTED THRONE');
      writeText(screen, 0, 19, 'DO YOU WANT TO (P)RY SOME JEWELS,');
      writeText(screen, 0, 20, '(S)IT DOWN, (R)EAD THE RUNES,');
      writeText(screen, 0, 22, 'OR (I)GNORE:');
      break;

    case SpecialLocationType.GrayCube:
      writeText(screen, 0, 19, 'YOU SEE A LARGE GRAY MISTY CUBE');
      writeText(screen, 0, 20, '<RET> TO WALK IN');
      writeText(screen, 0, 22, 'OR (I)GNORE:');
      break;

    case SpecialLocationType.Safe:
      writeText(screen, 0, 18, 'YOU SEE A SMALL BOX WITH FOUR LIGHTS');
      if (safeState && safeState.currentPosition > 1) {
        writeText(screen, 0, 19, `BUTTONS PRESSED: ${safeState.currentPosition - 1}`);
      }
      writeText(screen, 0, 20, 'PUSH (R)ED, (G)REEN, (Y)ELLOW, (B)LUE');
      writeText(screen, 0, 22, 'OR (I)GNORE:');
      break;

    case SpecialLocationType.Stairs:
      writeText(screen, 0, 19, 'YOU FOUND A CIRCULAR STAIRWAY');
      writeText(screen, 0, 20, 'DO YOU WANT TO GO (U)P, (D)OWN,');
      writeText(screen, 0, 22, 'OR (S)TAY ON THE SAME LEVEL?');
      break;

    case SpecialLocationType.Teleporter:
      writeText(screen, 0, 20, 'ZZAP!! YOU\'VE BEEN TELEPORTED..');
      break;

    default:
      writeText(screen, 0, 22, '(I)GNORE:');
      break;
  }
}

// Write text to screen buffer at position
function writeText(screen: string[][], x: number, y: number, text: string) {
  for (let i = 0; i < text.length && x + i < 40; i++) {
    if (y >= 0 && y < 24) {
      screen[y][x + i] = text[i];
    }
  }
}

// Word wrap text to fit within maxWidth columns
function wordWrap(text: string, maxWidth: number): string[] {
  const lines: string[] = [];
  const words = text.split(' ');
  let currentLine = '';

  for (const word of words) {
    if (currentLine.length === 0) {
      currentLine = word;
    } else if (currentLine.length + 1 + word.length <= maxWidth) {
      currentLine += ' ' + word;
    } else {
      lines.push(currentLine);
      currentLine = word;
    }
  }

  if (currentLine.length > 0) {
    lines.push(currentLine);
  }

  return lines;
}

// Render top-down grid dungeon view
function renderDungeonView(
  screen: string[][],
  character: Character,
  currentMonster: Monster | null,
  phase: GamePhase
) {
  // 3x3 room grid, each room is 7 chars wide, 5 chars tall
  const gridSize = 3;
  const cellW = 7;
  const cellH = 5;
  const playerRoomX = 1;
  const playerRoomY = 1;

  // Draw each room
  for (let ry = 0; ry < gridSize; ry++) {
    for (let rx = 0; rx < gridSize; rx++) {
      const worldX = character.position.x + (rx - playerRoomX);
      const worldY = character.position.y + (ry - playerRoomY);

      if (worldX < 1 || worldX > 200 || worldY < 1 || worldY > 200) continue;

      const room = getRoom({ x: worldX, y: worldY, z: character.position.z });
      const gx = rx * cellW;
      const gy = ry * cellH;

      // Draw walls with simple ASCII
      if (room.walls.north) {
        for (let x = 0; x <= cellW; x++) screen[gy][gx + x] = '-';
      }
      if (room.walls.south) {
        for (let x = 0; x <= cellW; x++) screen[gy + cellH][gx + x] = '-';
      }
      if (room.walls.west) {
        for (let y = 0; y <= cellH; y++) screen[gy + y][gx] = '|';
      }
      if (room.walls.east) {
        for (let y = 0; y <= cellH; y++) screen[gy + y][gx + cellW] = '|';
      }

      // Corners
      if (room.walls.north || room.walls.west) screen[gy][gx] = '+';
      if (room.walls.north || room.walls.east) screen[gy][gx + cellW] = '+';
      if (room.walls.south || room.walls.west) screen[gy + cellH][gx] = '+';
      if (room.walls.south || room.walls.east) screen[gy + cellH][gx + cellW] = '+';

      // Room content (center of cell)
      const cx = gx + Math.floor(cellW / 2);
      const cy = gy + Math.floor(cellH / 2);

      if (rx === playerRoomX && ry === playerRoomY) {
        // Player room - draw player
        screen[cy][cx] = 'X';

        // Monster if in combat
        if (phase === GamePhase.Combat && currentMonster) {
          screen[cy][cx - 2] = '#';
        }

        // Stairs
        if (room.hasStairsUp && room.hasStairsDown) {
          screen[cy - 1][cx] = '%';
        } else if (room.hasStairsUp) {
          screen[cy - 1][cx] = '<';
        } else if (room.hasStairsDown) {
          screen[cy - 1][cx] = '>';
        }

        // Special location marker
        if (room.specialType !== SpecialLocationType.None) {
          const markers: Record<SpecialLocationType, string> = {
            [SpecialLocationType.None]: ' ',
            [SpecialLocationType.Inn]: 'I',
            [SpecialLocationType.Elevator]: 'E',
            [SpecialLocationType.Pit]: 'P',
            [SpecialLocationType.Teleporter]: 'T',
            [SpecialLocationType.Stairs]: 'S',
            [SpecialLocationType.Altar]: 'A',
            [SpecialLocationType.Fountain]: 'F',
            [SpecialLocationType.GrayCube]: 'C',
            [SpecialLocationType.Throne]: 'H',
            [SpecialLocationType.Safe]: '$',
          };
          screen[cy + 1][cx] = markers[room.specialType];
        }
      }
    }
  }
}

// Render status panel on right side
function renderStatusPanel(screen: string[][], character: Character) {
  const col = 23;
  let row = 0;

  // Name and level
  writeText(screen, col, row++, character.name.substring(0, 7) + ' LVL ' + character.level);
  row++; // blank line

  // Stats
  writeText(screen, col, row++, `STR ${String(character.stats.strength).padStart(2)} CON ${String(character.stats.constitution).padStart(2)}`);
  writeText(screen, col, row++, `INT ${String(character.stats.intelligence).padStart(2)} DEX ${String(character.stats.dexterity).padStart(2)}`);
  writeText(screen, col, row++, `WIS ${String(character.stats.wisdom).padStart(2)} CHR ${String(character.stats.charisma).padStart(2)}`);
  row++; // blank line

  // HP, SU, EX, GLD
  writeText(screen, col, row++, `HP ${character.currentHp}/${character.maxHp}`);
  writeText(screen, col, row++, `SU ${character.spellUnits}/${character.maxSpellUnits}`);
  writeText(screen, col, row++, `EX ${character.experience}`);
  writeText(screen, col, row++, `GLD ${character.gold}`);

  // Equipment with bonuses
  if (character.inventory.sword) {
    writeText(screen, col, row++, `SWORD +${character.inventory.sword}`);
  }
  if (character.inventory.armor) {
    writeText(screen, col, row++, `ARMOR +${character.inventory.armor}`);
  }
  if (character.inventory.shield) {
    writeText(screen, col, row++, `SHIELD +${character.inventory.shield}`);
  }
  if (character.inventory.elvenCloak) {
    writeText(screen, col, row++, `ELVEN CLOAK`);
  }
  if (character.inventory.elvenBoots) {
    writeText(screen, col, row++, `ELVEN BOOTS`);
  }
}

// Render combat info box
function renderCombatBox(screen: string[][], monster: Monster) {
  const col = 23;
  const row = 17;
  writeText(screen, col, row, `LVL ${monster.level} ${monster.name}`);
}

const TitleScreen: React.FC = () => {
  const { startNewGame, loadCharacter, getSavedCharacters } = useGameStore();
  const [showLoad, setShowLoad] = React.useState(false);
  const savedChars = getSavedCharacters();

  return (
    <div className="font-mono text-green-400 bg-black min-h-screen p-4 flex flex-col items-center justify-center">
      <pre className="text-center mb-8">
{`
 ████████╗███████╗██╗     ███████╗███╗   ██╗ ██████╗  █████╗ ██████╗ ██████╗
 ╚══██╔══╝██╔════╝██║     ██╔════╝████╗  ██║██╔════╝ ██╔══██╗██╔══██╗██╔══██╗
    ██║   █████╗  ██║     █████╗  ██╔██╗ ██║██║  ███╗███████║██████╔╝██║  ██║
    ██║   ██╔══╝  ██║     ██╔══╝  ██║╚██╗██║██║   ██║██╔══██║██╔══██╗██║  ██║
    ██║   ███████╗███████╗███████╗██║ ╚████║╚██████╔╝██║  ██║██║  ██║██████╔╝
    ╚═╝   ╚══════╝╚══════╝╚══════╝╚═╝  ╚═══╝ ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═╝╚═════╝

                        V1.12 - Web Edition
                   Original (C) 1982 Avalon Hill
`}
      </pre>

      <div className="text-center space-y-4">
        <p>WOULD YOU LIKE TO:</p>
        <button
          onClick={startNewGame}
          className="block mx-auto hover:bg-green-400 hover:text-black px-4 py-2 border border-green-400"
        >
          (S)TART A NEW CHARACTER
        </button>

        {savedChars.length > 0 && (
          <button
            onClick={() => setShowLoad(!showLoad)}
            className="block mx-auto hover:bg-green-400 hover:text-black px-4 py-2 border border-green-400"
          >
            (R)EAD IN AN OLD ONE
          </button>
        )}

        {showLoad && savedChars.length > 0 && (
          <div className="mt-4 border border-green-400 p-4">
            <p className="mb-2">SAVED CHARACTERS:</p>
            {savedChars.map((name) => (
              <button
                key={name}
                onClick={() => loadCharacter(name)}
                className="block w-full text-left hover:bg-green-400 hover:text-black px-2 py-1"
              >
                {name}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const CharacterCreationScreen: React.FC = () => {
  const { rolledStats, rollNewStats, acceptStats } = useGameStore();
  const [name, setName] = React.useState('');
  const [showNamePrompt, setShowNamePrompt] = React.useState(false);

  // Build 40-column screen buffer (24 rows)
  const screen: string[][] = [];
  for (let i = 0; i < 24; i++) {
    screen.push(new Array(40).fill(' '));
  }

  // Write text helper
  const writeText = (x: number, y: number, text: string) => {
    for (let i = 0; i < text.length && x + i < 40; i++) {
      if (y >= 0 && y < 24) {
        screen[y][x + i] = text[i];
      }
    }
  };

  // Title
  writeText(8, 2, 'CREATE YOUR CHARACTER');

  if (rolledStats) {
    // Display rolled stats
    writeText(5, 6, `STRENGTH     ${String(rolledStats.strength).padStart(2)}`);
    writeText(5, 7, `INTELLIGENCE ${String(rolledStats.intelligence).padStart(2)}`);
    writeText(5, 8, `WISDOM       ${String(rolledStats.wisdom).padStart(2)}`);
    writeText(5, 9, `CONSTITUTION ${String(rolledStats.constitution).padStart(2)}`);
    writeText(5, 10, `DEXTERITY    ${String(rolledStats.dexterity).padStart(2)}`);
    writeText(5, 11, `CHARISMA     ${String(rolledStats.charisma).padStart(2)}`);

    if (!showNamePrompt) {
      writeText(2, 15, 'ARE THESE VALUES ACCEPTABLE?');
      writeText(2, 17, '(Y)ES OR (N)O:');
    } else {
      writeText(2, 15, 'ENTER YOUR NAME:');
      writeText(2, 17, '>' + name + '_');
      writeText(2, 20, 'PRESS <RET> WHEN DONE');
    }
  } else {
    writeText(5, 10, 'PRESS ANY KEY TO ROLL STATS');
  }

  // Handle keyboard
  React.useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (!rolledStats) {
        rollNewStats();
        return;
      }

      if (!showNamePrompt) {
        if (e.key.toLowerCase() === 'y') {
          setShowNamePrompt(true);
        } else if (e.key.toLowerCase() === 'n') {
          rollNewStats();
        }
      } else {
        if (e.key === 'Enter' && name.trim()) {
          acceptStats(name);
        } else if (e.key === 'Backspace') {
          setName(prev => prev.slice(0, -1));
        } else if (e.key.length === 1 && name.length < 7 && /[a-zA-Z]/.test(e.key)) {
          setName(prev => prev + e.key.toUpperCase());
        }
      }
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [rolledStats, showNamePrompt, name, rollNewStats, acceptStats]);

  return (
    <div className="font-mono bg-black min-h-screen flex items-center justify-center">
      <pre className="text-white text-sm leading-none" style={{ fontFamily: '"Apple2", "Courier New", monospace', letterSpacing: '0' }}>
        {screen.map(row => row.join('')).join('\n')}
      </pre>
    </div>
  );
};

export default AsciiRenderer;
