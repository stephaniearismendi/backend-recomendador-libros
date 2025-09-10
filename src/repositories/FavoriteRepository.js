const BaseRepository = require('./BaseRepository');

/**
 * Favorite Repository - Handles all favorite-related database operations
 * Extends BaseRepository with favorite-specific methods
 */
class FavoriteRepository extends BaseRepository {
    constructor() {
        super('favorite');
    }

    /**
     * Find favorite by user ID and book ID
     * @param {number} userId - The user ID
     * @param {string} bookId - The book ID
     * @returns {Promise<object|null>} The favorite or null
     */
    async findByUserAndBook(userId, bookId) {
        return this.prisma.favorite.findUnique({
            where: { userId_bookId: { userId, bookId } }
        });
    }

    /**
     * Find all favorites for a user
     * @param {number} userId - The user ID
     * @param {object} options - Additional options for the query
     * @returns {Promise<Array>} Array of favorites with book data
     */
    async findByUserId(userId, options = {}) {
        return this.findMany(
            { userId },
            {
                include: { book: true },
                ...options
            }
        );
    }

    /**
     * Create a new favorite
     * @param {number} userId - The user ID
     * @param {string} bookId - The book ID
     * @returns {Promise<object>} The created favorite
     */
    async createFavorite(userId, bookId) {
        return this.create({
            userId,
            bookId
        });
    }

    /**
     * Delete a favorite by user ID and book ID
     * @param {number} userId - The user ID
     * @param {string} bookId - The book ID
     * @returns {Promise<object>} The deleted favorite
     */
    async deleteFavorite(userId, bookId) {
        return this.prisma.favorite.delete({
            where: { userId_bookId: { userId, bookId } }
        });
    }

    /**
     * Check if user has a specific book as favorite
     * @param {number} userId - The user ID
     * @param {string} bookId - The book ID
     * @returns {Promise<boolean>} True if favorite exists, false otherwise
     */
    async userHasFavorite(userId, bookId) {
        const favorite = await this.prisma.favorite.findUnique({
            where: { userId_bookId: { userId, bookId } }
        });
        return favorite !== null;
    }

    /**
     * Get the count of favorites for a user
     * @param {number} userId - The user ID
     * @returns {Promise<number>} The count of favorites
     */
    async getFavoriteCountByUser(userId) {
        return this.count({ userId });
    }
}

module.exports = FavoriteRepository;
