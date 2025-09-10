const ReadingSessionService = require('../services/ReadingSessionService');
const asyncHandler = require('../errors/asyncHandler');
const { AppError } = require('../errors/AppError');

const startSession = asyncHandler(async (req, res) => {
    const { userId } = req.user;
    const { bookId, currentPage = 1, totalPages } = req.body;

    const readingSessionService = new ReadingSessionService();
    const session = await readingSessionService.startSession(userId, {
        bookId,
        currentPage,
        totalPages
    });

    res.status(201).json({
        success: true,
        message: 'Sesión de lectura iniciada',
        data: {
            id: session.id,
            book: session.book,
            currentPage: session.currentPage,
            totalPages: session.totalPages,
            progress: session.progress,
            startedAt: session.startedAt
        }
    });
});

const updateProgress = asyncHandler(async (req, res) => {
    const { userId } = req.user;
    const { sessionId, currentPage, progress, duration } = req.body;

    if (!sessionId) {
        throw new AppError('ID de sesión requerido', 400);
    }

    const readingSessionService = new ReadingSessionService();
    const session = await readingSessionService.updateProgress(userId, sessionId, {
        currentPage,
        progress,
        duration
    });

    res.json({
        success: true,
        message: 'Progreso actualizado',
        data: {
            id: session.id,
            book: session.book,
            currentPage: session.currentPage,
            totalPages: session.totalPages,
            progress: session.progress,
            duration: session.duration,
            lastReadAt: session.lastReadAt
        }
    });
});

const endSession = asyncHandler(async (req, res) => {
    const { userId } = req.user;
    const { sessionId } = req.body;

    if (!sessionId) {
        throw new AppError('ID de sesión requerido', 400);
    }

    const readingSessionService = new ReadingSessionService();
    const session = await readingSessionService.endSession(userId, sessionId);

    res.json({
        success: true,
        message: 'Sesión de lectura finalizada',
        data: {
            id: session.id,
            book: session.book,
            progress: session.progress,
            duration: session.duration,
            startedAt: session.startedAt,
            endedAt: session.endedAt
        }
    });
});

const getActiveSession = asyncHandler(async (req, res) => {
    const { userId } = req.user;
    const { bookId } = req.params;

    const readingSessionService = new ReadingSessionService();
    const session = await readingSessionService.getActiveSession(userId, bookId);

    res.json({
        success: true,
        data: {
            id: session.id,
            book: session.book,
            currentPage: session.currentPage,
            totalPages: session.totalPages,
            progress: session.progress,
            duration: session.duration,
            startedAt: session.startedAt,
            lastReadAt: session.lastReadAt
        }
    });
});

const getUserSessions = asyncHandler(async (req, res) => {
    const { userId } = req.user;
    const { page = 1, limit = 10, bookId } = req.query;

    const readingSessionService = new ReadingSessionService();
    const result = await readingSessionService.getUserSessions(userId, {
        page,
        limit,
        bookId
    });

    res.json({
        success: true,
        data: result
    });
});

module.exports = {
    startSession,
    updateProgress,
    endSession,
    getActiveSession,
    getUserSessions
};
