const app = require('./app');
const config = require('./config');
const logger = require('./core/logger');

const server = app.listen(config.port, () => {
    logger.info({ port: config.port, env: config.nodeEnv }, `Servidor levantado en el puerto ${config.port}`);
});

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
