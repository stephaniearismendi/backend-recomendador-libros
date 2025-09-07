const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

const crypto = require('crypto');
const pinoHttp = require('pino-http');
const logger = require('./core/logger');

const app = express();
dotenv.config();

app.use(cors());
app.use(express.json());

const isProd = process.env.NODE_ENV === 'production';

if (process.env.HTTP_LOG !== '0') {
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

// Import routes
const userRoutes = require('./routes/userRoutes');
const bookRoutes = require('./routes/bookRoutes');
const favoriteRoutes = require('./routes/favoriteRoutes');
const recommenderRoutes = require('./routes/recommenderRoutes');
const socialRoutes = require('./routes/socialRoutes');
const seedRoutes = require('./routes/seedRoutes');

// Import error handling
const errorHandler = require('./errors/errorHandler');

// Routes
app.use('/users', userRoutes);
app.use('/books', bookRoutes);
app.use('/favorites', favoriteRoutes);
app.use('/recommendations', recommenderRoutes);
app.use('/social', socialRoutes);
app.use('/seed', seedRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
    });
});

// 404 handler for undefined routes
app.use((req, res, next) => {
    const err = new Error(`Can't find ${req.originalUrl} on this server!`);
    err.statusCode = 404;
    next(err);
});

// Global error handling middleware
app.use(errorHandler);

module.exports = app;
