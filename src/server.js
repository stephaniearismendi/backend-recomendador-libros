const app = require('./app');
const logger = require('./core/logger');

const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
    logger.info({ port: PORT }, `Servidor levantado en el puerto ${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    logger.info('SIGTERM received. Shutting down gracefully...');
    server.close(() => {
        logger.info('Process terminated');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    logger.info('SIGINT received. Shutting down gracefully...');
    server.close(() => {
        logger.info('Process terminated');
        process.exit(0);
    });
});

module.exports = app;
