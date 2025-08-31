const http = require('http');
const https = require('https');
const axios = require('axios');
const { createLimiter, withTimeout } = require('../utils/utils.js');

const agentHttp  = new http.Agent({ keepAlive: true, maxSockets: 50 });
const agentHttps = new https.Agent({ keepAlive: true, maxSockets: 50 });

const AX = axios.create({
    timeout: 12000,
    httpAgent: agentHttp,
    httpsAgent: agentHttps,
});

const limit = createLimiter(Number(process.env.HTTP_CONCURRENCY || 6));

module.exports = { AX, limit, withTimeout };
