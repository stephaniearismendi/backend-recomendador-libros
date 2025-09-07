const http = require('http');
const https = require('https');
const axios = require('axios');
const { createLimiter, withTimeout } = require('../utils/utils.js');
const logger = require('./logger');

const agentHttp = new http.Agent({ keepAlive: true, maxSockets: 50 });
const agentHttps = new https.Agent({ keepAlive: true, maxSockets: 50 });

const AX = axios.create({
    timeout: 12000,
    httpAgent: agentHttp,
    httpsAgent: agentHttps,
});

if (process.env.LOG_HTTP === '1') {
    AX.interceptors.request.use((cfg) => {
        cfg.metadata = { start: process.hrtime.bigint() };
        const base = (cfg.baseURL || '').replace(/\/$/, '');
        logger.info(
            {
                out: true,
                method: (cfg.method || 'get').toUpperCase(),
                url: `${base}${cfg.url || ''}`,
            },
            'http →'
        );
        return cfg;
    });
    AX.interceptors.response.use(
        (res) => {
            const ms = res.config.metadata?.start
                ? Number(process.hrtime.bigint() - res.config.metadata.start) / 1e6
                : null;
            logger.info(
                {
                    out: true,
                    method: (res.config.method || 'get').toUpperCase(),
                    url: res.config.url,
                    status: res.status,
                    ms,
                },
                'http ←'
            );
            return res;
        },
        (err) => {
            const cfg = err.config || {};
            const ms = cfg.metadata?.start
                ? Number(process.hrtime.bigint() - cfg.metadata.start) / 1e6
                : null;
            logger.warn(
                {
                    out: true,
                    method: (cfg.method || 'get').toUpperCase(),
                    url: cfg.url,
                    status: err.response?.status,
                    ms,
                    msg: err.message,
                },
                'http ×'
            );
            return Promise.reject(err);
        }
    );
}

const limit = createLimiter(Number(process.env.HTTP_CONCURRENCY || 6));
module.exports = { AX, limit, withTimeout };
