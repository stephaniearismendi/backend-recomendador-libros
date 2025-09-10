const ReadingSessionRepository = require('../repositories/ReadingSessionRepository');
const GamificationService = require('./GamificationService');
const AppError = require('../errors/AppError');

class ReadingSessionService {
    constructor() {
        this.readingSessionRepository = new ReadingSessionRepository();
        this.gamificationService = new GamificationService();
    }

    /**
     * Start a new reading session
     * @param {number} userId - The user ID
     * @param {object} sessionData - The session data
     * @param {string} sessionData.bookId - The book ID
     * @param {number} [sessionData.currentPage] - Current page number
     * @param {number} [sessionData.totalPages] - Total pages in the book
     * @returns {Promise<object>} The created session with book information
     * @throws {AppError} If book ID is missing or session already exists
     */
    async startSession(userId, sessionData) {
        const { bookId, currentPage = 1, totalPages } = sessionData;

        if (!bookId) {
            throw new AppError('ID del libro requerido', 400);
        }

        const existingActiveSession = await this.readingSessionRepository.findActiveSession(userId, bookId);
        if (existingActiveSession) {
            throw new AppError('Ya tienes una sesión activa para este libro', 409);
        }

        // ensure no other active sessions exist for this user-book combination
        const allActiveSessions = await this.readingSessionRepository.findUserActiveSessions(userId);
        const duplicateSession = allActiveSessions.find(session => session.bookId === bookId);
        if (duplicateSession) {
            throw new AppError('Ya tienes una sesión activa para este libro', 409);
        }

        const session = await this.readingSessionRepository.createSession({
            userId,
            bookId,
            currentPage,
            totalPages: totalPages || null,
            progress: currentPage
        });

        return this.readingSessionRepository.getSessionWithBook(session.id);
    }

    /**
     * Update reading session progress
     * @param {number} userId - The user ID
     * @param {number} sessionId - The session ID
     * @param {object} progressData - The progress data
     * @param {number} [progressData.currentPage] - Current page number
     * @param {number} [progressData.progress] - Progress value
     * @param {number} [progressData.duration] - Additional reading duration
     * @returns {Promise<object>} The updated session with book information
     * @throws {AppError} If session not found, inactive, or progress is invalid
     */
    async updateProgress(userId, sessionId, progressData) {
        const { currentPage, progress, duration } = progressData;

        const session = await this.readingSessionRepository.findById(sessionId);
        if (!session || session.userId !== userId || !session.isActive) {
            throw new AppError('Sesión no encontrada o inactiva', 404);
        }

        const updateData = {};

        if (currentPage !== undefined) {
            if (currentPage < session.currentPage) {
                throw new AppError('El progreso debe ser mayor al actual', 400);
            }
            updateData.currentPage = currentPage;
            updateData.progress = currentPage;
        }

        if (progress !== undefined) {
            if (progress < session.progress) {
                throw new AppError('El progreso debe ser mayor al actual', 400);
            }
            updateData.progress = progress;
        }

        if (duration !== undefined) {
            updateData.duration = session.duration + duration;
        }

        await this.readingSessionRepository.updateSessionProgress(sessionId, updateData);

        const updatedSession = await this.readingSessionRepository.findById(sessionId);
        const isCompleted = this.isBookCompleted(updatedSession);

        const pagesRead = currentPage ? currentPage - (session.currentPage || 0) : 0;
        
        console.log('=== UPDATE PROGRESS GAMIFICATION ===');
        console.log('Current page:', currentPage);
        console.log('Previous current page:', session.currentPage);
        console.log('Pages read this update:', pagesRead);
        console.log('Is completed:', isCompleted);
        
        await this.gamificationService.updateReadingProgress(userId, updatedSession.bookId, {
            pagesRead,
            totalPages: updatedSession.totalPages,
            isCompleted
        });

        return this.readingSessionRepository.getSessionWithBook(sessionId);
    }

    /**
     * End a reading session
     * @param {number} userId - The user ID
     * @param {number} sessionId - The session ID
     * @returns {Promise<object>} The ended session with book information
     * @throws {AppError} If session not found or inactive
     */
    async endSession(userId, sessionId) {
        const session = await this.readingSessionRepository.findById(sessionId);
        if (!session || session.userId !== userId || !session.isActive) {
            throw new AppError('Sesión no encontrada o inactiva', 404);
        }

        const endedAt = new Date();
        const totalDuration = Math.floor((endedAt - session.startedAt) / 1000);

        await this.readingSessionRepository.endSession(sessionId);
        
        await this.readingSessionRepository.updateById(sessionId, {
            duration: totalDuration
        });

        const isCompleted = this.isBookCompleted(session);

        console.log('=== END SESSION GAMIFICATION ===');
        console.log('Session progress:', session.progress);
        console.log('Total pages:', session.totalPages);
        console.log('Is completed:', isCompleted);

        await this.gamificationService.updateReadingProgress(userId, session.bookId, {
            pagesRead: session.progress,
            totalPages: session.totalPages,
            isCompleted
        });

        return this.readingSessionRepository.getSessionWithBook(sessionId);
    }

    /**
     * Get active session for a user and book
     * @param {number} userId - The user ID
     * @param {string} bookId - The book ID
     * @returns {Promise<object>} The active session with book information
     * @throws {AppError} If no active session found
     */
    async getActiveSession(userId, bookId) {
        const session = await this.readingSessionRepository.findActiveSession(userId, bookId);
        if (!session) {
            throw new AppError('No hay sesión activa para este libro', 404);
        }

        return this.readingSessionRepository.getSessionWithBook(session.id);
    }

    /**
     * Get user's reading sessions
     * @param {number} userId - The user ID
     * @param {object} [options] - Query options
     * @param {number} [options.page] - Page number
     * @param {number} [options.limit] - Items per page
     * @returns {Promise<object>} User sessions with pagination
     */
    async getUserSessions(userId, options = {}) {
        const { sessions, total } = await this.readingSessionRepository.findUserSessions(userId, options);
        
        return {
            sessions: sessions.map(session => ({
                id: session.id,
                book: session.book,
                currentPage: session.currentPage,
                totalPages: session.totalPages,
                progress: session.progress,
                duration: session.duration,
                isActive: session.isActive,
                startedAt: session.startedAt,
                endedAt: session.endedAt,
                lastReadAt: session.lastReadAt
            })),
            pagination: {
                page: parseInt(options.page || 1),
                limit: parseInt(options.limit || 10),
                total,
                pages: Math.ceil(total / (options.limit || 10))
            }
        };
    }

    /**
     * Check if a book is completed based on session progress
     * @param {object} session - The reading session
     * @param {number} session.progress - Current progress
     * @param {number} session.totalPages - Total pages in book
     * @returns {boolean} True if book is completed
     */
    isBookCompleted(session) {
        if (!session.totalPages || session.totalPages <= 0) {
            return false;
        }
        
        const completionThreshold = 0.9;
        const progressPercentage = session.progress / session.totalPages;
        
        console.log('=== BOOK COMPLETION CHECK ===');
        console.log('Session progress:', session.progress);
        console.log('Total pages:', session.totalPages);
        console.log('Progress percentage:', progressPercentage);
        console.log('Completion threshold:', completionThreshold);
        console.log('Is completed:', progressPercentage >= completionThreshold);
        
        return progressPercentage >= completionThreshold;
    }
}

module.exports = ReadingSessionService;
