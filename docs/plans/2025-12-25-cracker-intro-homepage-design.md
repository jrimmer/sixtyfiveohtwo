# Cracker Intro Homepage Design

## Overview

Redesign the SixtyFiveOhTwo home page to resemble an early 1980s Apple II warez/cracker boot menu aesthetic, with a full boot simulation sequence and configurable intro features.

## Visual Style

- **Apple II Warez aesthetic:** ASCII art banners, minimal design, authentic boot sequence
- **Green phosphor color scheme:** Classic `#33ff33` on black
- **CRT effects:** Scanlines, vignette, subtle flicker during boot

## Boot Sequence Flow

```
[BLACK SCREEN]
     ↓ (500ms)
APPLE ][
     ↓ (300ms)
CHECKING MEMORY...
48K OK
     ↓ (800ms)
[Disk drive animation]
LOADING SIXTYFIVEOHTWO...
TRACK 01 → TRACK 17  /
     ↓ (configurable delay, ~2s default)
[MAIN MENU APPEARS]
```

- Skip option: Any key or click bypasses boot sequence
- Plays once per session (sessionStorage)
- "PRESS ANY KEY TO SKIP" appears after 1 second

## ASCII Banner

Two styles, randomly selected per session:

**Style A - Block Letters:**
```
 ███  █████  ███  ████
█     █     █   █     █
████  ████  █   █  ███
█   █     █ █   █ █
 ███  █████  ███  ████

SIXTYFIVEOHTWO
```

**Style B - Figlet/Slashes:**
```
  __   _____  ___  ____
 / /  | ____||   \|___ \
/ /_  |____ || |\ \ __) |
| '_ \  ___) || |/ |/ __/
| (_) ||____/ |___/|_____|
 \___/

SIXTYFIVEOHTWO
```

Banner appears top-left. Style persists via session cookie.

## Main Menu Layout

```
┌─────────────────────────────────────────┐
│ [ASCII BANNER - 6502]                   │
│ SIXTYFIVEOHTWO                          │
│                                         │
│ SELECT PROGRAM:                         │
│                                         │
│ 1. TELENGARD                            │
│    Dungeon crawler RPG                  │
│ 2. SABOTAGE                             │
│    Defend your base                     │
│ 3. THE PROVING GROUNDS                  │
│    BBS door game                        │
│                                         │
│ ENTER SELECTION (1-3): _                │
│                                         │
│ ←← SCROLLING MARQUEE TEXT ←←            │
└─────────────────────────────────────────┘
```

## Interactive Features

### Keyboard Navigation
- `1`, `2`, `3` - Navigate directly to games
- `G` - Toggle greets easter egg overlay
- Any key during boot - Skip to menu

### Greets Easter Egg (press G)
```
┌─────────────────────────────────────────┐
│                                         │
│          GREETS FLY OUT TO:             │
│                                         │
│    THE STACK · APPLE MAFIA              │
│    DIGITAL GANG · MIDWEST PIRATES       │
│                                         │
│          PRESS G TO CLOSE               │
│                                         │
└─────────────────────────────────────────┘
```

Centered overlay with fade-in. Configurable list via env var.

### Audio (optional, disabled by default)
- Boot sequence: Soft click on phase transitions
- Disk loading: Rhythmic stepping sound (simulated drive head)
- Menu: Click on keypress

Uses Web Audio API oscillator tones - no external files.

## Environment Variables

```bash
# Intro Boot Sequence
INTRO_BOOT_ENABLED=true           # Show boot simulation (default: true)
INTRO_BOOT_DELAY=2000             # Total boot sequence duration in ms (default: 2000)

# Scrolling Marquee
INTRO_MARQUEE_ENABLED=true        # Show scrolling text (default: true)
INTRO_MARQUEE_TEXT="SIXTYFIVEOHTWO PRESENTS CLASSIC APPLE II GAMES FAITHFULLY RECREATED FOR THE MODERN WEB... ORIGINAL AUTHORS FOREVER..."
INTRO_MARQUEE_SPEED=50            # Pixels per second (default: 50)

# Greets Easter Egg
INTRO_GREETS_ENABLED=true         # Enable 'G' key easter egg (default: true)
INTRO_GREETS_LIST="THE STACK,APPLE MAFIA,DIGITAL GANG,MIDWEST PIRATES"

# Audio
INTRO_AUDIO_ENABLED=false         # Disk/keyboard sounds (default: false)

# Banner Style
INTRO_BANNER_STYLE=random         # random|block|figlet (default: random)
```

## Technical Implementation

### File Changes

| File | Change |
|------|--------|
| `views/index.ejs` | Complete rewrite with boot sequence, ASCII banners, marquee, easter egg |
| `server.js` | Add config parsing, pass intro settings to template, set session cookie for banner style |
| `.env.example` | Add all `INTRO_*` variables with defaults |

### Template Structure (index.ejs)

```html
<body>
  <!-- Boot Sequence (hidden after complete) -->
  <div id="boot-screen">...</div>

  <!-- Main Menu (hidden until boot complete) -->
  <div id="menu-screen">
    <pre id="ascii-banner">...</pre>
    <nav>...</nav>
    <div id="marquee">...</div>
  </div>

  <!-- Greets Overlay (hidden until G pressed) -->
  <div id="greets-overlay">...</div>

  <script>/* Boot sequence, audio, keyboard handling */</script>
</body>
```

### Session Cookie

`intro_banner_style` cookie set server-side on first visit (random choice of `block` or `figlet`), read on subsequent requests.

### CSS Effects

Retained:
- Green phosphor colors
- CRT monitor frame
- Scanline overlay
- Vignette darkening
- Blinking cursor
- VT323 font

New:
- Marquee: CSS infinite scroll animation
- Boot text: Typing effect via `steps()` or JS
- Disk spinner: Rotating `|/-\` keyframes
- Greets overlay: Fade-in transition
- Screen flicker: Opacity animation during boot

## Error Handling

- **JavaScript disabled:** Menu displays immediately (CSS default state)
- **Missing env vars:** All have code defaults; works without any `INTRO_*` set
- **Empty greets list:** Shows "NO GREETS TODAY"
- **Session cookie blocked:** Falls back to random banner each load

## Summary

| Feature | Default | Configurable |
|---------|---------|--------------|
| Boot sequence | Enabled, 2s | `INTRO_BOOT_ENABLED`, `INTRO_BOOT_DELAY` |
| ASCII banner (6502) | Random style per session | `INTRO_BANNER_STYLE` |
| Scrolling marquee | Enabled, project message | `INTRO_MARQUEE_ENABLED`, `INTRO_MARQUEE_TEXT`, `INTRO_MARQUEE_SPEED` |
| Greets easter egg | Enabled, press G | `INTRO_GREETS_ENABLED`, `INTRO_GREETS_LIST` |
| Audio effects | Disabled | `INTRO_AUDIO_ENABLED` |
