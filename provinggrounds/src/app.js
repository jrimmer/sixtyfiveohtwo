/**
 * Proving Grounds BBS - Web Recreation
 * Main application entry point
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

// View engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../views'));

// Security middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'"],  // Needed for inline scripts
            styleSrc: ["'self'", "'unsafe-inline'"],   // Needed for inline styles
            imgSrc: ["'self'", "data:"],
            connectSrc: ["'self'", "ws:", "wss:"],     // WebSocket connections
        }
    }
}));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../public')));

// Session configuration
const sessionMiddleware = session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,  // Prevent XSS access to session cookie
        sameSite: 'lax', // CSRF protection
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

// Database connection
const Database = require('better-sqlite3');
const DB_PATH = process.env.DATABASE_PATH || './data/provinggrounds.db';
let db;

try {
    db = new Database(DB_PATH);
    db.pragma('foreign_keys = ON');
    app.set('db', db);
} catch (err) {
    console.error('Database connection failed. Run "npm run db:init" first.');
    console.error(err.message);
    process.exit(1);
}

// Health check endpoint (for Railway/load balancers)
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Load routes
const authRoutes = require('./routes/auth');
const mainRoutes = require('./routes/main');
const boardRoutes = require('./routes/boards');
const combatRoutes = require('./routes/combat');
const storeRoutes = require('./routes/stores');
const gameRoutes = require('./routes/games');

app.use('/', authRoutes);
app.use('/main', mainRoutes);
app.use('/boards', boardRoutes);
app.use('/combat', combatRoutes);
app.use('/stores', storeRoutes);
app.use('/games', gameRoutes);

// Socket.IO connection handling (for chat and real-time features)
io.on('connection', (socket) => {
    const session = socket.request.session;

    if (session && session.userId) {
        console.log(`User ${session.userId} connected via WebSocket`);

        // Join user to their personal room
        socket.join(`user-${session.userId}`);

        // Handle sysop chat requests
        socket.on('chat-message', (data) => {
            // Broadcast to sysop if online
            io.to('sysop').emit('user-chat', {
                userId: session.userId,
                username: session.username,
                message: data.message
            });
        });

        // Handle sysop responses
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
    res.status(500).render('pages/error', {
        title: 'Error',
        status: 500,
        message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong!'
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).render('pages/error', {
        title: 'Not Found',
        status: 404,
        message: 'The requested page was not found.'
    });
});

// Start server
httpServer.listen(PORT, () => {
    console.log(`
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║            THE PROVING GROUNDS BBS                         ║
║                                                            ║
║    A Web Recreation of the Classic Apple II BBS            ║
║                                                            ║
╠════════════════════════════════════════════════════════════╣
║                                                            ║
║    Server running on http://localhost:${PORT}                 ║
║                                                            ║
║    Press Ctrl+C to stop                                    ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
    `);
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\nShutting down...');
    if (db) db.close();
    process.exit(0);
});

module.exports = app;
