/**
 * SixtyFiveOhTwo - Classic 6502 Games Collection
 * Main application server
 */

require('dotenv').config();

const express = require('express');
const session = require('express-session');
const helmet = require('helmet');
const { createServer } = require('http');
const { Server } = require('socket.io');
const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');
const SqliteStore = require('better-sqlite3-session-store')(session);

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer);

// Trust proxy for reverse proxy deployments (Coolify, Railway, etc.)
// Required for secure cookies to work behind a proxy
app.set('trust proxy', 1);

// Configuration
const PORT = process.env.PORT || 3000;

// Require SESSION_SECRET in production
if (process.env.NODE_ENV === 'production' && !process.env.SESSION_SECRET) {
    console.error('FATAL: SESSION_SECRET environment variable is required in production');
    process.exit(1);
}
const SESSION_SECRET = process.env.SESSION_SECRET || 'dev-only-secret-change-in-prod';

// Sanitize text input (strip HTML entities)
function sanitizeText(text) {
    return text.replace(/[<>&"']/g, c => ({
        '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;'
    })[c]);
}

// Intro configuration with defaults
const introConfig = {
    boot: {
        enabled: process.env.INTRO_BOOT_ENABLED !== 'false',
        delay: parseInt(process.env.INTRO_BOOT_DELAY, 10) || 2000
    },
    marquee: {
        enabled: process.env.INTRO_MARQUEE_ENABLED !== 'false',
        text: sanitizeText(process.env.INTRO_MARQUEE_TEXT || 'SIXTYFIVEOHTWO PRESENTS CLASSIC APPLE II GAMES FAITHFULLY RECREATED FOR THE MODERN WEB... ORIGINAL AUTHORS FOREVER...'),
        speed: parseInt(process.env.INTRO_MARQUEE_SPEED, 10) || 50
    },
    greets: {
        enabled: process.env.INTRO_GREETS_ENABLED !== 'false',
        list: (process.env.INTRO_GREETS_LIST || 'THE STACK,APPLE MAFIA,DIGITAL GANG,MIDWEST PIRATES').split(',').map(s => sanitizeText(s.trim()))
    },
    audio: {
        enabled: process.env.INTRO_AUDIO_ENABLED === 'true'
    },
    bannerStyle: process.env.INTRO_BANNER_STYLE || 'random'
};

// ASCII art banners for 6502 logo
const banners = {
    block: ` ██████  ███████  ██████  ██████
██       ██      ██  ████      ██
███████  ███████ ██ ██ ██  █████
██    ██      ██ ████  ██ ██
 ██████  ███████  ██████  ███████`,
    figlet: `   __   ____   ___  ____
  / /  | ___| / _ \\|___ \\
 / /_  |___ \\| | | | __) |
| '_ \\  ___) | |_| |/ __/
| (_) ||____/ \\___/|_____|
 \\___/`
};

// Get intro render data (used by index and 404)
function getIntroRenderData(session) {
    let bannerStyle = session?.bannerStyle;
    if (!bannerStyle) {
        bannerStyle = introConfig.bannerStyle === 'random'
            ? (Math.random() < 0.5 ? 'block' : 'figlet')
            : introConfig.bannerStyle;
    }
    return { intro: introConfig, bannerStyle, banners };
}

// View engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Security middleware with relaxed CSP for game apps
const isHttps = process.env.HTTPS_ENABLED === 'true';
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            imgSrc: ["'self'", "data:", "blob:"],
            connectSrc: ["'self'", "ws:", "wss:"],
            workerSrc: ["'self'", "blob:"],
            upgradeInsecureRequests: isHttps ? [] : null,
        }
    },
    // Disable HSTS when not using HTTPS (prevents browser forcing HTTPS)
    strictTransportSecurity: isHttps,
    // Disable cross-origin policies that cause issues over HTTP
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: false,
    crossOriginResourcePolicy: false,
}));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Session store (SQLite for production, memory for dev)
const SESSION_DB_PATH = process.env.SESSION_DB_PATH ||
    (process.env.NODE_ENV === 'production' ? '/data/sessions.db' : './data/sessions.db');
let sessionStore;
if (process.env.NODE_ENV === 'production') {
    const sessionDir = path.dirname(SESSION_DB_PATH);
    if (!fs.existsSync(sessionDir)) {
        fs.mkdirSync(sessionDir, { recursive: true });
    }
    const sessionDb = new Database(SESSION_DB_PATH);
    sessionStore = new SqliteStore({
        client: sessionDb,
        expired: { clear: true, intervalMs: 900000 } // Clean expired sessions every 15 min
    });
}

// Session configuration
const sessionMiddleware = session({
    store: sessionStore,
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
});

app.use(sessionMiddleware);

// Share session with Socket.IO
io.use((socket, next) => {
    sessionMiddleware(socket.request, {}, next);
});

// Make io available to routes
app.set('io', io);

// Health check endpoint (for Railway/load balancers)
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Main index page - game selection menu
app.get('/', (req, res) => {
    const data = getIntroRenderData(req.session);
    if (!req.session.bannerStyle) {
        req.session.bannerStyle = data.bannerStyle;
    }
    res.render('index', data);
});

// -----------------------------
// Static Game Apps
// -----------------------------

// Telengard - Vite React app (static build)
app.use('/telengard', express.static(path.join(__dirname, 'telengard/dist')));
app.get('/telengard/{*path}', (req, res) => {
    res.sendFile(path.join(__dirname, 'telengard/dist/index.html'));
});

// Sabotage - Vite React app (static build)
app.use('/sabotage', express.static(path.join(__dirname, 'sabotage/sabotage-web/dist')));
app.get('/sabotage/{*path}', (req, res) => {
    res.sendFile(path.join(__dirname, 'sabotage/sabotage-web/dist/index.html'));
});

// -----------------------------
// Proving Grounds - Express App
// -----------------------------

// Database connection for Proving Grounds
const DB_PATH = process.env.DATABASE_PATH ||
    (process.env.NODE_ENV === 'production' ? '/data/provinggrounds.db' : './provinggrounds/data/provinggrounds.db');
let db;

// Auto-initialize database if it doesn't exist
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

try {
    const dbExists = fs.existsSync(DB_PATH);
    db = new Database(DB_PATH);
    db.pragma('foreign_keys = ON');

    if (!dbExists) {
        console.log('Initializing Proving Grounds database...');
        const schemaPath = path.join(__dirname, 'provinggrounds/src/db/schema.sql');
        const schema = fs.readFileSync(schemaPath, 'utf8');
        db.exec(schema);

        // Insert default config
        const insertConfig = db.prepare('INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)');
        const defaults = {
            bbs_name: 'The Proving Grounds', sysop_name: 'Sysop', max_users: '500',
            calls_per_day: '2', minutes_per_call: '60', max_level: '100',
            fight_level_range: '2', max_fights_per_day: '4', max_jousts_per_day: '2',
            corridor_rooms: '200', adventure_rooms: '900', registration_captcha: '0', version: '1.0.0'
        };
        for (const [key, value] of Object.entries(defaults)) {
            insertConfig.run(key, value);
        }
        console.log('Proving Grounds database initialized.');
    }

    app.set('db', db);
} catch (err) {
    console.error('Proving Grounds database error:', err.message);
}

// Proving Grounds static assets
app.use('/provinggrounds', express.static(path.join(__dirname, 'provinggrounds/public')));

// Proving Grounds view engine for sub-routes
app.set('provinggrounds-views', path.join(__dirname, 'provinggrounds/views'));

// Mount Proving Grounds routes with /provinggrounds prefix
if (db) {
    const pgAuthRoutes = require('./provinggrounds/src/routes/auth');
    const pgMainRoutes = require('./provinggrounds/src/routes/main');
    const pgBoardRoutes = require('./provinggrounds/src/routes/boards');
    const pgCombatRoutes = require('./provinggrounds/src/routes/combat');
    const pgStoreRoutes = require('./provinggrounds/src/routes/stores');
    const pgGameRoutes = require('./provinggrounds/src/routes/games');

    // Override render to use absolute view paths (avoids race conditions with global views setting)
    const pgViewsDir = path.join(__dirname, 'provinggrounds/views');
    app.use('/provinggrounds', (req, res, next) => {
        const originalRender = res.render.bind(res);
        res.render = (view, options, callback) => {
            const absoluteView = path.join(pgViewsDir, view) + '.ejs';
            originalRender(absoluteView, options, callback);
        };
        next();
    });

    app.use('/provinggrounds', pgAuthRoutes);
    app.use('/provinggrounds/main', pgMainRoutes);
    app.use('/provinggrounds/boards', pgBoardRoutes);
    app.use('/provinggrounds/combat', pgCombatRoutes);
    app.use('/provinggrounds/stores', pgStoreRoutes);
    app.use('/provinggrounds/games', pgGameRoutes);
}

// -----------------------------
// TPro BBS - Express App
// -----------------------------

// Database connection for TPro BBS
// Uses ensure.js which safely creates schema/seeds if needed without destroying data
const TPRO_DB_PATH = process.env.TPROBBS_DATABASE_PATH ||
    (process.env.NODE_ENV === 'production' ? '/data/tprobbs.db' : './tprobbs/data/tprobbs.db');
let tprodb;

try {
    // Ensure database exists and is seeded (safe to run every startup)
    const ensureDatabase = require('./tprobbs/src/db/ensure');
    ensureDatabase();

    tprodb = new Database(TPRO_DB_PATH);
    tprodb.pragma('foreign_keys = ON');
    app.set('tprodb', tprodb);
} catch (err) {
    console.error('TPro BBS database error:', err.message);
}

// Mount TPro BBS routes with /tprobbs prefix
if (tprodb) {
    const { loadUser } = require('./tprobbs/src/middleware/auth');

    // Override render to use absolute view paths (avoids race conditions with global views setting)
    const tproViewsDir = path.join(__dirname, 'tprobbs/views');
    app.use('/tprobbs', (req, res, next) => {
        const originalRender = res.render.bind(res);
        res.render = (view, options, callback) => {
            const absoluteView = path.join(tproViewsDir, view) + '.ejs';
            originalRender(absoluteView, options, callback);
        };
        next();
    });

    // Load user middleware
    app.use('/tprobbs', loadUser(tprodb));

    // Mount routes
    const tproBbsRoutes = require('./tprobbs/src/routes/index');
    app.use('/tprobbs', tproBbsRoutes);
}

// Socket.IO for Proving Grounds
io.on('connection', (socket) => {
    const session = socket.request.session;

    if (session && session.userId) {
        console.log(`User ${session.userId} connected via WebSocket`);
        socket.join(`user-${session.userId}`);

        socket.on('chat-message', (data) => {
            io.to('sysop').emit('user-chat', {
                userId: session.userId,
                username: session.username,
                message: data.message
            });
        });

        socket.on('sysop-message', (data) => {
            if (session.isSysop) {
                io.to(`user-${data.userId}`).emit('sysop-chat', {
                    message: data.message
                });
            }
        });

        socket.on('disconnect', () => {
            console.log(`User ${session.userId} disconnected`);
        });
    }
});

// Error handling
app.use((err, req, res, next) => {
    console.error(err.stack);
    const errorMessage = process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong!';

    // Render error page for tprobbs routes (use absolute path)
    if (req.path.startsWith('/tprobbs')) {
        return res.status(500).render(path.join(__dirname, 'tprobbs/views/pages/error.ejs'), {
            title: 'Error',
            error: errorMessage
        });
    }

    // Render error page for provinggrounds routes (use absolute path)
    if (req.path.startsWith('/provinggrounds')) {
        return res.status(500).render(path.join(__dirname, 'provinggrounds/views/pages/error.ejs'), {
            title: 'Error',
            status: 500,
            message: errorMessage
        });
    }

    // JSON response for API routes
    res.status(500).json({ error: errorMessage });
});

// 404 handler - render index with intro config (use absolute path)
app.use((req, res) => {
    res.status(404).render(path.join(__dirname, 'views/index.ejs'), getIntroRenderData(req.session));
});

// Start server
httpServer.listen(PORT, () => {
    console.log(`
    ╔═══════════════════════════════════════════════════════════════╗
    ║                                                               ║
    ║   ███████╗██╗██╗  ██╗████████╗██╗   ██╗███████╗██╗██╗   ██╗  ║
    ║   ██╔════╝██║╚██╗██╔╝╚══██╔══╝╚██╗ ██╔╝██╔════╝██║██║   ██║  ║
    ║   ███████╗██║ ╚███╔╝    ██║    ╚████╔╝ █████╗  ██║██║   ██║  ║
    ║   ╚════██║██║ ██╔██╗    ██║     ╚██╔╝  ██╔══╝  ██║╚██╗ ██╔╝  ║
    ║   ███████║██║██╔╝ ██╗   ██║      ██║   ██║     ██║ ╚████╔╝   ║
    ║   ╚══════╝╚═╝╚═╝  ╚═╝   ╚═╝      ╚═╝   ╚═╝     ╚═╝  ╚═══╝    ║
    ║                      SixtyFiveOhTwo                           ║
    ║               Classic 6502 Games Collection                   ║
    ╠═══════════════════════════════════════════════════════════════╣
    ║   Server running on http://localhost:${PORT}                     ║
    ║                                                               ║
    ║   Games:                                                      ║
    ║   - Telengard      → /telengard/                              ║
    ║   - Sabotage       → /sabotage/                               ║
    ║   - Proving Grounds→ /provinggrounds/                         ║
    ║   - TPro BBS       → /tprobbs/                                ║
    ╚═══════════════════════════════════════════════════════════════╝
    `);
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\nShutting down...');
    if (db) db.close();
    if (tprodb) tprodb.close();
    process.exit(0);
});

module.exports = app;
