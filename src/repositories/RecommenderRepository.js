const BaseRepository = require('./BaseRepository');

/**
 * Recommender Repository - Handles all recommendation-related database operations
 * Extends BaseRepository with recommendation-specific methods
 */
class RecommenderRepository extends BaseRepository {
    constructor() {
        super();
    }

    /**
     * Get favorite books to use as seeds for recommendations
     * @param {number} userId - The user ID
     * @param {number} maxSeeds - Maximum number of seed books to return
     * @returns {Promise<Array>} Array of favorite books with book data
     */
    async getFavoriteSeeds(userId, maxSeeds = 8) {
        return await this.prisma.favorite.findMany({
            where: { userId: Number(userId) },
            include: { book: true },
            take: maxSeeds,
        });
    }

    /**
     * Get favorite book IDs for a user
     * @param {number} userId - The user ID
     * @param {number} limit - Maximum number of book IDs to return
     * @returns {Promise<Array>} Array of favorite book IDs
     */
    async getFavoriteIds(userId, limit = 50) {
        return await this.prisma.favorite.findMany({
            where: { userId: Number(userId) },
            select: { bookId: true },
            take: limit,
        });
    }
}

module.exports = RecommenderRepository;
