const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const pinoHttp = require('pino-http');
const config = require('./config');
const logger = require('./core/logger');

const app = express();

app.use(cors({
    origin: config.cors.origin,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

const isProd = config.nodeEnv === 'production';

if (config.logging.httpLog) {
    app.use(
        pinoHttp({
            logger,
            genReqId: (req, _res) => req.headers['x-request-id'] || crypto.randomUUID(),
            customLogLevel(req, res, err) {
                if (res.statusCode >= 500 || err) return 'error';
                if (res.statusCode >= 400) return 'warn';
                return 'info';
            },
            autoLogging: isProd
                ? { ignore: (req) => ['/health', '/metrics', '/favicon.ico'].includes(req.url) }
                : true,
            customProps(req, res) {
                const cLen = res.getHeader('content-length') || 0;
                return isProd
                    ? { contentLength: cLen }
                    : { contentLength: cLen, userId: req.user?.userId };
            },
        })
    );

    app.use((req, res, next) => {
        res.setHeader('x-request-id', req.id);
        next();
    });
}

const userRoutes = require('./routes/userRoutes');
const bookRoutes = require('./routes/bookRoutes');
const favoriteRoutes = require('./routes/favoriteRoutes');
const recommenderRoutes = require('./routes/recommenderRoutes');
const socialRoutes = require('./routes/socialRoutes');
const gamificationRoutes = require('./routes/gamificationRoutes');
const readingSessionRoutes = require('./routes/readingSessionRoutes');

const errorHandler = require('./errors/errorHandler');

app.use('/users', userRoutes);
app.use('/books', bookRoutes);
app.use('/favorites', favoriteRoutes);
app.use('/recommendations', recommenderRoutes);
app.use('/social', socialRoutes);
app.use('/gamification', gamificationRoutes);
app.use('/reading-sessions', readingSessionRoutes);

app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
    });
});

app.use((req, res, next) => {
    const err = new Error(`Can't find ${req.originalUrl} on this server!`);
    err.statusCode = 404;
    next(err);
});

app.use(errorHandler);

module.exports = app;
