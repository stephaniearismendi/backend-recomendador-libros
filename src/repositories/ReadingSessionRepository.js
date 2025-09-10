const BaseRepository = require('./BaseRepository');

/**
 * Reading Session Repository - Handles all reading session-related database operations
 * Extends BaseRepository with reading session-specific methods
 */
class ReadingSessionRepository extends BaseRepository {
    constructor() {
        super('readingSession');
    }

    /**
     * Find active reading session for user and book
     * @param {number} userId - The user ID
     * @param {string} bookId - The book ID
     * @returns {Promise<object|null>} The active session or null
     */
    async findActiveSession(userId, bookId) {
        return this.findOne({
            userId,
            bookId,
            isActive: true
        });
    }

    /**
     * Find all active reading sessions for a user
     * @param {number} userId - The user ID
     * @returns {Promise<Array>} Array of active sessions
     */
    async findUserActiveSessions(userId) {
        return this.findMany({
            userId,
            isActive: true
        });
    }

    /**
     * Find user reading sessions with pagination and optional book filter
     * @param {number} userId - The user ID
     * @param {object} options - Pagination and filter options (page, limit, bookId)
     * @returns {Promise<object>} Object with sessions array and total count
     */
    async findUserSessions(userId, options = {}) {
        const { page = 1, limit = 10, bookId } = options;
        
        const where = {
            userId,
            ...(bookId && { bookId })
        };

        const [sessions, total] = await Promise.all([
            this.findMany(where, {
                include: {
                    book: {
                        select: {
                            id: true,
                            title: true,
                            author: true,
                            imageUrl: true
                        }
                    }
                },
                orderBy: { lastReadAt: 'desc' },
                skip: (page - 1) * limit,
                take: parseInt(limit)
            }),
            this.count(where)
        ]);

        return { sessions, total };
    }

    /**
     * Create a new reading session
     * @param {object} sessionData - The session data
     * @returns {Promise<object>} The created session
     */
    async createSession(sessionData) {
        return this.create({
            ...sessionData,
            isActive: true,
            startedAt: new Date(),
            lastReadAt: new Date()
        });
    }

    /**
     * Update reading session progress
     * @param {number} sessionId - The session ID
     * @param {object} progressData - The progress data to update
     * @returns {Promise<object>} The updated session
     */
    async updateSessionProgress(sessionId, progressData) {
        const updateData = {
            lastReadAt: new Date(),
            ...progressData
        };

        return this.updateById(sessionId, updateData);
    }

    /**
     * End a reading session
     * @param {number} sessionId - The session ID
     * @returns {Promise<object>} The updated session
     */
    async endSession(sessionId) {
        const endedAt = new Date();
        return this.updateById(sessionId, {
            isActive: false,
            endedAt
        });
    }

    /**
     * Get reading session with book information
     * @param {number} sessionId - The session ID
     * @returns {Promise<object|null>} The session with book data or null
     */
    async getSessionWithBook(sessionId) {
        return this.findById(sessionId, {
            include: {
                book: {
                    select: {
                        id: true,
                        title: true,
                        author: true,
                        imageUrl: true
                    }
                }
            }
        });
    }
}

module.exports = ReadingSessionRepository;
