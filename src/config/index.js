const dotenv = require('dotenv');

dotenv.config();

const config = {
    port: process.env.PORT || 3000,
    nodeEnv: process.env.NODE_ENV || 'development',
    jwt: {
        secret: process.env.JWT_SECRET,
        expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    },
    database: {
        url: process.env.DATABASE_URL,
    },
    cors: {
        origin: process.env.CORS_ORIGIN || '*',
    },
    logging: {
        httpLog: process.env.HTTP_LOG !== '0',
        level: process.env.LOG_LEVEL || 'info',
    },
};

const requiredEnvVars = ['JWT_SECRET', 'DATABASE_URL'];
const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
}

module.exports = config;
