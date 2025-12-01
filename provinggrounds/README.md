# The Proving Grounds BBS

A web recreation of the classic Apple II-era BBS door game "The Proving Grounds" - a fantasy RPG adventure system.

## Features

- **Character System**: Create characters with stats (Strength, Agility, Wisdom, Intelligence), levels 1-100, and equipment
- **Combat**: Fight monsters in dungeons or challenge other users in PvP combat
- **Stores**: Buy weapons, armor, spells, healing, and food at the Bazaar
- **Gambling**: Slot machines, blackjack, roulette, and Russian roulette
- **Jousting**: Mounted combat at The Proving Downs
- **Message Boards**: Classic BBS-style message boards with multiple access levels
- **Private Mail**: Send messages to other users
- **Castle System**: Protect your gold with castle defenses
- **Voting Booth**: Daily voting with rewards
- **Rankings**: Compete on The Ladder

## Tech Stack

- **Backend**: Node.js with Express
- **Database**: SQLite (better-sqlite3)
- **Templating**: EJS
- **Authentication**: bcrypt with express-session
- **Styling**: Custom terminal/CRT aesthetic CSS

## Setup

### Prerequisites

- Node.js 18+
- npm

### Installation

```bash
# Install dependencies
npm install

# Initialize the database
npm run db:init

# Seed with game data
npm run db:seed

# Start the server
npm run dev
```

The server runs at `http://localhost:3000`

## Environment Variables

Create a `.env` file:

```
PORT=3000
SESSION_SECRET=your-secret-key-here
NODE_ENV=development
LOGIN_BYPASS_KEY=your-bypass-key
REGISTRATION_CAPTCHA=0
```

### Configuration Options

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 3000 | Server port |
| `SESSION_SECRET` | (required in prod) | Secret for session encryption |
| `DATABASE_PATH` | `./data/provinggrounds.db` | Path to SQLite database |
| `LOGIN_BYPASS_KEY` | (none) | Sysop bypass key for call limits |
| `REGISTRATION_CAPTCHA` | 0 | Enable math CAPTCHA on registration (0=off, 1=on) |

## Daily Call Limits

Users have a limited number of logins ("calls") per day, mimicking the original BBS experience. Bypasses available:

1. **Admin users**: Set `is_admin = 1` in the database
2. **Bypass key**: Navigate to `/?bypass=your-bypass-key`
3. **Extra calls**: Earned through voting (10% chance) or granted by admins

## Enhancements

This web recreation includes several optional features to enhance the retro experience:

### Screen Themes

Mimics classic 1980s phosphor monitors:
- **Native** (default) - The "modern" green terminal look
- **Green Phosphor** - Classic green CRT
- **Amber Phosphor** - Common on early IBM and business monitors
- **White Phosphor** - Early monochrome displays

Select from the dropdown in the bottom-right corner. Preference saved in browser.

### Baud Rate Simulation

Simulates the character-by-character text rendering of dial-up modems:
- 300 baud (33ms/char) - Painfully authentic
- 1200 baud (8ms/char)
- 2400 baud (4ms/char)
- 9600 baud (1ms/char)
- 14.4k baud
- 28.8k baud
- Unlimited (default) - Instant rendering

Press any key to skip the rendering animation. Preference saved in browser.

### Registration CAPTCHA

Optional terminal-style math CAPTCHA to prevent bot registrations:
- Disabled by default
- Enable with `REGISTRATION_CAPTCHA=1` in `.env`
- Simple math problems (addition, subtraction, multiplication)
- ASCII-art styled challenge box

### ASCII Art Styling

UI elements use period-accurate box drawing characters instead of CSS borders:
- Double-line borders (`═══`) for headers and combat logs
- Single-line borders (`───`) for message boards
- Square brackets (`[1]`) for pagination
- Form elements (inputs, buttons) retain CSS borders for visibility

## Project Structure

```
provinggrounds/
├── src/
│   ├── app.js          # Express app setup
│   ├── routes/         # Route handlers
│   │   ├── auth.js     # Login/registration
│   │   ├── main.js     # Main menu routes
│   │   ├── stores.js   # Shop routes
│   │   ├── games.js    # Gambling routes
│   │   ├── combat.js   # Fighting routes
│   │   └── boards.js   # Message board routes
│   └── db/
│       ├── schema.sql  # Database schema
│       ├── init.js     # DB initialization
│       └── seed.js     # Seed data
├── views/
│   ├── pages/          # EJS templates
│   └── partials/       # Shared components
├── public/
│   └── css/            # Stylesheets
└── data/               # SQLite database
```

## Deployment

### Platform Recommendation: Railway

| Factor | Railway | Render |
|--------|---------|--------|
| Pricing | $5/month + usage | $7/month (Starter) |
| Cold Starts | None | 30+ sec on free tier |
| SQLite Support | Excellent | Requires paid plan |
| Setup Complexity | Simple | Moderate |

Railway is recommended for its always-on service and simpler SQLite setup.

### Pre-Deployment Checklist

**Security (included):**
- [x] Helmet.js security headers
- [x] Session cookie `httpOnly` and `sameSite` flags
- [x] Parameterized SQL queries (SQL injection safe)
- [x] EJS auto-escaping (XSS safe)
- [x] Input validation on all routes
- [x] `SESSION_SECRET` required in production

**Generate a secure session secret:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Railway Deployment

1. Push your code to GitHub

2. Create a new project on [Railway](https://railway.app) and connect your repo

3. Add a persistent volume:
   - Go to your service settings
   - Add a volume mounted at `/data`

4. Set environment variables:
   ```
   NODE_ENV=production
   SESSION_SECRET=<your-64-char-random-string>
   DATABASE_PATH=/data/provinggrounds.db
   LOGIN_BYPASS_KEY=<your-sysop-key>
   REGISTRATION_CAPTCHA=0
   ```

5. Deploy - Railway auto-detects Node.js and runs `npm start`

6. After first deploy, open the Railway shell and run:
   ```bash
   npm run db:init
   npm run db:seed
   ```

### Health Check

A health endpoint is available at `/health` for monitoring:
```json
{"status":"ok","timestamp":"2024-01-01T00:00:00.000Z"}
```

### Post-Deployment Considerations

| Enhancement | Purpose |
|-------------|---------|
| Database backups | Schedule regular SQLite backups |
| Rate limiting | Prevent brute force attacks |
| Error tracking | Add Sentry or similar for production errors |
| Custom domain | Configure DNS for your domain |

## Credits

- Original game: Unknown author (c. 1980s Apple II BBS era)
- Derived from Apple II disk images archived at: http://software.bbsdocumentary.com/APPLE/II/PROVINGGROUNDS/
- Web recreation: 2025

## License

MIT
