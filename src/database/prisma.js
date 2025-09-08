const { PrismaClient } = require('@prisma/client');

const prisma = (() => {
    if (!global.__PRISMA__) {
        global.__PRISMA__ = new PrismaClient({
            log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
            errorFormat: 'pretty',
        });
    }
    return global.__PRISMA__;
})();

process.on('beforeExit', async () => {
    await prisma.$disconnect();
});

process.on('SIGINT', async () => {
    await prisma.$disconnect();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    await prisma.$disconnect();
    process.exit(0);
});

module.exports = prisma;
