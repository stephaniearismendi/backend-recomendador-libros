const readingSessionController = require('../../src/controllers/readingSessionController');
const ReadingSessionService = require('../../src/services/ReadingSessionService');

jest.mock('../../src/services/ReadingSessionService');

describe('ReadingSessionController', () => {
    let mockReq, mockRes, mockNext;

    beforeEach(() => {
        mockReq = {
            user: { userId: 1 },
            body: {},
            params: {}
        };
        mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
        mockNext = jest.fn();
        jest.clearAllMocks();
    });

    describe('startSession', () => {
        it('should start a new reading session successfully', async () => {
            const mockSession = {
                id: 1,
                book: { id: 'book1', title: 'Test Book' },
                currentPage: 1,
                totalPages: 100,
                progress: 1,
                startedAt: new Date()
            };

            ReadingSessionService.prototype.startSession = jest.fn().mockResolvedValue(mockSession);

            await readingSessionController.startSession(mockReq, mockRes, mockNext);

            expect(mockRes.status).toHaveBeenCalledWith(201);
            expect(mockRes.json).toHaveBeenCalledWith({
                success: true,
                message: 'Sesión de lectura iniciada',
                data: expect.objectContaining({
                    id: 1,
                    book: expect.any(Object),
                    currentPage: 1,
                    totalPages: 100,
                    progress: 1,
                    startedAt: expect.any(Date)
                })
            });
        });
    });

    describe('updateProgress', () => {
        it('should update reading progress successfully', async () => {
            const mockSession = {
                id: 1,
                book: { id: 'book1', title: 'Test Book' },
                currentPage: 10,
                totalPages: 100,
                progress: 10,
                duration: 300,
                lastReadAt: new Date()
            };

            ReadingSessionService.prototype.updateProgress = jest.fn().mockResolvedValue(mockSession);

            mockReq.body = { sessionId: 1, currentPage: 10, duration: 300 };

            await readingSessionController.updateProgress(mockReq, mockRes, mockNext);

            expect(mockRes.json).toHaveBeenCalledWith({
                success: true,
                message: 'Progreso actualizado',
                data: expect.objectContaining({
                    id: 1,
                    currentPage: 10,
                    progress: 10,
                    duration: 300
                })
            });
        });
    });

    describe('endSession', () => {
        it('should end reading session successfully', async () => {
            const mockSession = {
                id: 1,
                book: { id: 'book1', title: 'Test Book' },
                progress: 50,
                duration: 1800,
                startedAt: new Date(),
                endedAt: new Date()
            };

            ReadingSessionService.prototype.endSession = jest.fn().mockResolvedValue(mockSession);

            mockReq.body = { sessionId: 1 };

            await readingSessionController.endSession(mockReq, mockRes, mockNext);

            expect(mockRes.json).toHaveBeenCalledWith({
                success: true,
                message: 'Sesión de lectura finalizada',
                data: expect.objectContaining({
                    id: 1,
                    progress: 50,
                    duration: 1800,
                    startedAt: expect.any(Date),
                    endedAt: expect.any(Date)
                })
            });
        });
    });

    describe('getActiveSession', () => {
        it('should get active session successfully', async () => {
            const mockSession = {
                id: 1,
                book: { id: 'book1', title: 'Test Book' },
                currentPage: 25,
                totalPages: 100,
                progress: 25,
                duration: 600,
                startedAt: new Date(),
                lastReadAt: new Date()
            };

            ReadingSessionService.prototype.getActiveSession = jest.fn().mockResolvedValue(mockSession);

            mockReq.params = { bookId: 'book1' };

            await readingSessionController.getActiveSession(mockReq, mockRes, mockNext);

            expect(mockRes.json).toHaveBeenCalledWith({
                success: true,
                data: expect.objectContaining({
                    id: 1,
                    currentPage: 25,
                    progress: 25,
                    duration: 600
                })
            });
        });
    });

    describe('getUserSessions', () => {
        it('should get user sessions successfully', async () => {
            const mockResult = {
                sessions: [
                    {
                        id: 1,
                        book: { id: 'book1', title: 'Test Book' },
                        currentPage: 50,
                        totalPages: 100,
                        progress: 50,
                        duration: 1200,
                        isActive: false,
                        startedAt: new Date(),
                        endedAt: new Date(),
                        lastReadAt: new Date()
                    }
                ],
                pagination: {
                    page: 1,
                    limit: 10,
                    total: 1,
                    pages: 1
                }
            };

            ReadingSessionService.prototype.getUserSessions = jest.fn().mockResolvedValue(mockResult);

            mockReq.query = { page: 1, limit: 10 };

            await readingSessionController.getUserSessions(mockReq, mockRes, mockNext);

            expect(mockRes.json).toHaveBeenCalledWith({
                success: true,
                data: expect.objectContaining({
                    sessions: expect.any(Array),
                    pagination: expect.any(Object)
                })
            });
        });
    });
});
