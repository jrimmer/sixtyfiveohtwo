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

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer);

// Configuration
const PORT = process.env.PORT || 3000;

// Require SESSION_SECRET in production
if (process.env.NODE_ENV === 'production' && !process.env.SESSION_SECRET) {
    console.error('FATAL: SESSION_SECRET environment variable is required in production');
    process.exit(1);
}
const SESSION_SECRET = process.env.SESSION_SECRET || 'dev-only-secret-change-in-prod';

// Intro configuration with defaults
const introConfig = {
    boot: {
        enabled: process.env.INTRO_BOOT_ENABLED !== 'false',
        delay: parseInt(process.env.INTRO_BOOT_DELAY, 10) || 2000
    },
    marquee: {
        enabled: process.env.INTRO_MARQUEE_ENABLED !== 'false',
        text: process.env.INTRO_MARQUEE_TEXT || 'SIXTYFIVEOHTWO PRESENTS CLASSIC APPLE II GAMES FAITHFULLY RECREATED FOR THE MODERN WEB... ORIGINAL AUTHORS FOREVER...',
        speed: parseInt(process.env.INTRO_MARQUEE_SPEED, 10) || 50
    },
    greets: {
        enabled: process.env.INTRO_GREETS_ENABLED !== 'false',
        list: (process.env.INTRO_GREETS_LIST || 'THE STACK,APPLE MAFIA,DIGITAL GANG,MIDWEST PIRATES').split(',').map(s => s.trim())
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

// View engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Security middleware with relaxed CSP for game apps
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
        }
    }
}));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Session configuration
const sessionMiddleware = session({
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
    // Determine banner style (persist in session)
    let bannerStyle = req.session.bannerStyle;
    if (!bannerStyle) {
        if (introConfig.bannerStyle === 'random') {
            bannerStyle = Math.random() < 0.5 ? 'block' : 'figlet';
        } else {
            bannerStyle = introConfig.bannerStyle;
        }
        req.session.bannerStyle = bannerStyle;
    }

    res.render('index', {
        intro: introConfig,
        bannerStyle,
        banners
    });
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
const Database = require('better-sqlite3');
const DB_PATH = process.env.DATABASE_PATH || './provinggrounds/data/provinggrounds.db';
let db;

try {
    db = new Database(DB_PATH);
    db.pragma('foreign_keys = ON');
    app.set('db', db);
} catch (err) {
    console.warn('Proving Grounds database not found. Run "cd provinggrounds && npm run db:init" to initialize.');
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

    // Override render for provinggrounds routes
    app.use('/provinggrounds', (req, res, next) => {
        const originalRender = res.render.bind(res);
        res.render = (view, options) => {
            originalRender(view, {
                ...options,
                settings: {
                    ...req.app.settings,
                    views: path.join(__dirname, 'provinggrounds/views')
                }
            });
        };
        // Store the original views path
        req.app.set('views', path.join(__dirname, 'provinggrounds/views'));
        next();
    });

    app.use('/provinggrounds', pgAuthRoutes);
    app.use('/provinggrounds/main', pgMainRoutes);
    app.use('/provinggrounds/boards', pgBoardRoutes);
    app.use('/provinggrounds/combat', pgCombatRoutes);
    app.use('/provinggrounds/stores', pgStoreRoutes);
    app.use('/provinggrounds/games', pgGameRoutes);
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
    res.status(500).json({
        error: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong!'
    });
});

// 404 handler - render index with intro config
app.use((req, res) => {
    // Reset views to root (provinggrounds middleware may have changed it)
    req.app.set('views', path.join(__dirname, 'views'));

    let bannerStyle = req.session?.bannerStyle;
    if (!bannerStyle) {
        bannerStyle = introConfig.bannerStyle === 'random'
            ? (Math.random() < 0.5 ? 'block' : 'figlet')
            : introConfig.bannerStyle;
    }
    res.status(404).render('index', {
        intro: introConfig,
        bannerStyle,
        banners
    });
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
    ╚═══════════════════════════════════════════════════════════════╝
    `);
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\nShutting down...');
    if (db) db.close();
    process.exit(0);
});

module.exports = app;
