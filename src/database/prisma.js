const { PrismaClient } = require('@prisma/client');

const prisma = (() => {
    if (!global.__PRISMA__) {
        global.__PRISMA__ = new PrismaClient();
    }
    return global.__PRISMA__;
})();

module.exports = prisma;
