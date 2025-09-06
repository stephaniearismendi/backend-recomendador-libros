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
    app.use(pinoHttp({
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
            return isProd ? { contentLength: cLen } : { contentLength: cLen, userId: req.user?.userId };
        },
    }));

    app.use((req, res, next) => { res.setHeader('x-request-id', req.id); next(); });
}

const userRoutes = require('./routes/userRoutes');
const bookRoutes = require('./routes/bookRoutes');
const favoriteRoutes = require('./routes/favoriteRoutes');
const recommenderRoutes = require('./routes/recommenderRoutes');
const socialRoutes = require('./routes/socialRoutes');
const seedRoutes = require('./routes/seedRoutes');

app.use('/users', userRoutes);
app.use('/books', bookRoutes);
app.use('/favorites', favoriteRoutes);
app.use('/recommendations', recommenderRoutes);
app.use('/social', socialRoutes);
app.use('/seed', seedRoutes);

const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
    logger.info({ port: PORT }, `Servidor levantado en el puerto ${PORT}`);
});

process.on('SIGTERM', () => server.close(() => process.exit(0)));
process.on('SIGINT', () => server.close(() => process.exit(0)));
