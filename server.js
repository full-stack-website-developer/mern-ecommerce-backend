import app from './app.js';
import config from './config/app.config.js';
import connectDatabase from './database.config.js';
import logger from './utils/logger.util.js';

// Connect to database
connectDatabase();

// Start server
const server = app.listen(config.port, () => {
    logger.info(`Server running in ${config.env} mode on port ${config.port}`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
    logger.error('Unhandled Promise Rejection:', err);
    server.close(() => process.exit(1));
});