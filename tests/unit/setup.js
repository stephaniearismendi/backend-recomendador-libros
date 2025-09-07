// Global test setup for unit tests
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key';
process.env.DATABASE_URL = 'file:./test.db';
process.env.LOG_HTTP = '0';
process.env.LOG_ENABLED = '0';
process.env.GOOGLE_BOOKS_API_KEY = 'test-google-key';
process.env.DEEPL_API_KEY = 'test-deepl-key';
process.env.NYT_API_KEY = 'test-nyt-key';

// Mock console methods to reduce noise in tests
global.console = {
    ...console,
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
};

// Auto-mock Prisma client
jest.mock('../../src/database/prisma', () => require('./__mocks__/prisma'));
