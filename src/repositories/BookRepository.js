const BaseRepository = require('./BaseRepository');

/**
 * Book Repository - Handles all book-related database operations
 * Extends BaseRepository with book-specific methods
 */
class BookRepository extends BaseRepository {
    constructor() {
        super('book');
    }

    /**
     * Find books by title (case-insensitive search)
     * @param {string} title - The title to search for
     * @param {object} options - Additional options for the query
     * @returns {Promise<Array>} Array of found books
     */
    async findByTitle(title, options = {}) {
        return this.findMany({
            title: {
                contains: title,
                mode: 'insensitive',
            },
        }, options);
    }

    /**
     * Find books by author (case-insensitive search)
     * @param {string} author - The author to search for
     * @param {object} options - Additional options for the query
     * @returns {Promise<Array>} Array of found books
     */
    async findByAuthor(author, options = {}) {
        return this.findMany({
            author: {
                contains: author,
                mode: 'insensitive',
            },
        }, options);
    }

    /**
     * Find books by category
     * @param {string} category - The category to search for
     * @param {object} options - Additional options for the query
     * @returns {Promise<Array>} Array of found books
     */
    async findByCategory(category, options = {}) {
        return this.findMany({ category }, options);
    }

    /**
     * Search books by multiple criteria
     * @param {object} searchCriteria - The search criteria
     * @param {object} options - Additional options for the query
     * @returns {Promise<Array>} Array of found books
     */
    async searchBooks(searchCriteria, options = {}) {
        const { title, author, category } = searchCriteria;
        const where = {};

        if (title) {
            where.title = {
                contains: title,
                mode: 'insensitive',
            };
        }

        if (author) {
            where.author = {
                contains: author,
                mode: 'insensitive',
            };
        }

        if (category) {
            where.category = category;
        }

        return this.findMany(where, options);
    }

    /**
     * Get books with their review counts and average ratings
     * @param {object} where - The where clause
     * @param {object} options - Additional options for the query
     * @returns {Promise<Array>} Array of books with review statistics
     */
    async getBooksWithReviewStats(where = {}, options = {}) {
        return this.findMany(where, {
            include: {
                _count: {
                    select: {
                        reviews: true,
                        favorites: true,
                    },
                },
                reviews: {
                    select: {
                        rating: true,
                    },
                },
            },
            ...options,
        });
    }

    /**
     * Get popular books (most favorited)
     * @param {number} limit - The number of books to return
     * @param {object} options - Additional options for the query
     * @returns {Promise<Array>} Array of popular books
     */
    async getPopularBooks(limit = 10, options = {}) {
        return this.findMany({}, {
            include: {
                _count: {
                    select: {
                        favorites: true,
                        reviews: true,
                    },
                },
            },
            orderBy: {
                favorites: {
                    _count: 'desc',
                },
            },
            take: limit,
            ...options,
        });
    }

    /**
     * Get recently added books
     * @param {number} limit - The number of books to return
     * @param {object} options - Additional options for the query
     * @returns {Promise<Array>} Array of recently added books
     */
    async getRecentBooks(limit = 10, options = {}) {
        return this.findMany({}, {
            orderBy: {
                id: 'desc',
            },
            take: limit,
            ...options,
        });
    }
}

module.exports = BookRepository;
