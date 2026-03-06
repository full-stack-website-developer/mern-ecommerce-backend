import { createServer } from 'http';
import { Server } from 'socket.io';
import app from './app.js';
import config from './config/app.config.js';
import connectDatabase from './database.config.js';
import logger from './utils/logger.util.js';
import { initSocketIO } from './socket/chat.socket.js';

// Connect to database
connectDatabase();

// Create HTTP server (shared between Express + Socket.IO)
const httpServer = createServer(app);

// Initialize Socket.IO
const io = new Server(httpServer, {
    cors: {
        origin: config.cors.origin || 'http://localhost:5173',
        methods: ['GET', 'POST'],
        credentials: true,
    },
    transports: ['websocket', 'polling'],
});

// Attach Socket.IO chat handlers
initSocketIO(io);

// Make io accessible in routes/controllers if needed
app.set('io', io);

// Start server
httpServer.listen(config.port, () => {
    logger.info(`Server running in ${config.env} mode on port ${config.port}`);
    logger.info(`Socket.IO ready`);
});

process.on("uncaughtException", (err) => {
  console.error("🔥 UNCAUGHT EXCEPTION:");
  console.error(err.stack);
});

process.on("unhandledRejection", (err) => {
  console.error("🔥 UNHANDLED REJECTION:");
  console.error(err.stack);
});

// process.on('unhandledRejection', (err) => {
//     logger.error('Unhandled Promise Rejection:', err);
//     httpServer.close(() => process.exit(1));
// });