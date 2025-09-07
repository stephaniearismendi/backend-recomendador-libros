// Global test setup
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

// Simple mock setup for all tests
const mockPrisma = {
    user: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        deleteMany: jest.fn(),
        count: jest.fn(),
    },
    book: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        deleteMany: jest.fn(),
        count: jest.fn(),
        upsert: jest.fn(),
    },
    favorite: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        deleteMany: jest.fn(),
        count: jest.fn(),
        upsert: jest.fn(),
    },
    $connect: jest.fn(),
    $disconnect: jest.fn(),
};

jest.mock('../src/database/prisma', () => mockPrisma);

// Configure mock implementations
mockPrisma.user.create.mockResolvedValue({
    id: 1,
    email: 'test@example.com',
    name: 'Test User',
    password: 'hashedpassword',
    createdAt: new Date(),
    updatedAt: new Date()
});

// Mock user lookup for login
mockPrisma.user.findUnique.mockImplementation(({ where }) => {
    if (where.email === 'login@example.com') {
        return Promise.resolve({
            id: 1,
            email: 'login@example.com',
            name: 'Login User',
            password: 'hashedpassword',
            createdAt: new Date(),
            updatedAt: new Date()
        });
    }
    return Promise.resolve(null);
});

mockPrisma.user.findFirst.mockImplementation(({ where }) => {
    if (where.email === 'login@example.com') {
        return Promise.resolve({
            id: 1,
            email: 'login@example.com',
            name: 'Login User',
            password: 'hashedpassword',
            createdAt: new Date(),
            updatedAt: new Date()
        });
    }
    return Promise.resolve(null);
});

mockPrisma.user.findMany.mockResolvedValue([]);
mockPrisma.user.update.mockResolvedValue({
    id: 1,
    email: 'test@example.com',
    name: 'Updated User',
    createdAt: new Date(),
    updatedAt: new Date()
});

mockPrisma.book.findMany.mockResolvedValue([]);
mockPrisma.book.findUnique.mockResolvedValue(null);
mockPrisma.book.upsert.mockResolvedValue({
    id: 'book1',
    title: 'Test Book',
    author: 'Test Author'
});

mockPrisma.favorite.findMany.mockResolvedValue([]);
mockPrisma.favorite.findUnique.mockResolvedValue(null);
mockPrisma.favorite.create.mockResolvedValue({
    id: 1,
    userId: 1,
    bookId: 'book1'
});
mockPrisma.favorite.delete.mockResolvedValue({
    id: 1,
    userId: 1,
    bookId: 'book1'
});

// Mock bcrypt
jest.mock('bcryptjs', () => ({
    hash: jest.fn().mockResolvedValue('hashedpassword'),
    compare: jest.fn().mockResolvedValue(true),
}));

// Mock jwt
jest.mock('jsonwebtoken', () => ({
    sign: jest.fn().mockReturnValue('mock-jwt-token'),
    verify: jest.fn().mockReturnValue({ userId: 1 }),
}));
