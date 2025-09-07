const pino = require('pino');

const isProd = process.env.NODE_ENV === 'production';

const logger = pino({
    enabled: process.env.LOG_ENABLED !== '0',
    level: process.env.LOG_LEVEL || (isProd ? 'warn' : 'info'),
    base: isProd ? null : undefined,
    redact: {
        paths: ['req.headers.authorization', 'req.headers.cookie'],
        remove: true,
    },
    transport: !isProd
        ? {
            target: 'pino-pretty',
            options: {
                colorize: true,
                translateTime: 'HH:MM:ss.l',
                ignore: 'pid,hostname',
                messageFormat:
                      '{req.method} {req.url} -> {res.statusCode} {responseTime}ms {contentLength}b{#if userId} user={userId}{/if} reqId={req.id}',
            },
        }
        : undefined,
});

module.exports = logger;
