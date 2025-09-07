const BookRepository = require('../repositories/BookRepository');
const AppError = require('../errors/AppError');

/**
 * Book Service - Handles all book-related business logic
 * Encapsulates book operations and business rules
 */
class BookService {
    constructor() {
        this.bookRepository = new BookRepository();
    }

    /**
     * Get book by ID
     * @param {string} bookId - The book ID
     * @returns {Promise<object>} The book data
     * @throws {AppError} If book not found
     */
    async getBookById(bookId) {
        if (!bookId) {
            throw new AppError('ID del libro requerido', 400);
        }

        const book = await this.bookRepository.findById(bookId, {
            include: {
                _count: {
                    select: {
                        reviews: true,
                        favorites: true,
                    },
                },
            },
        });

        if (!book) {
            throw new AppError('Libro no encontrado', 404);
        }

        return { book };
    }

    /**
     * Search books by criteria
     * @param {object} searchCriteria - The search criteria
     * @param {string} [searchCriteria.title] - Book title to search
     * @param {string} [searchCriteria.author] - Author to search
     * @param {string} [searchCriteria.category] - Category to filter
     * @param {number} [limit] - Maximum number of results
     * @param {number} [offset] - Number of results to skip
     * @returns {Promise<object>} The search results
     */
    async searchBooks(searchCriteria, limit = 20, offset = 0) {
        const books = await this.bookRepository.searchBooks(searchCriteria, {
            include: {
                _count: {
                    select: {
                        reviews: true,
                        favorites: true,
                    },
                },
            },
            take: limit,
            skip: offset,
            orderBy: {
                title: 'asc',
            },
        });

        const totalCount = await this.bookRepository.count(
            this._buildSearchWhereClause(searchCriteria)
        );

        return {
            books,
            pagination: {
                total: totalCount,
                limit,
                offset,
                hasMore: offset + limit < totalCount,
            },
        };
    }

    /**
     * Get popular books
     * @param {number} [limit] - Maximum number of results
     * @returns {Promise<object>} The popular books
     */
    async getPopularBooks(limit = 10) {
        const books = await this.bookRepository.getPopularBooks(limit);

        return { books };
    }

    /**
     * Get recently added books
     * @param {number} [limit] - Maximum number of results
     * @returns {Promise<object>} The recent books
     */
    async getRecentBooks(limit = 10) {
        const books = await this.bookRepository.getRecentBooks(limit);

        return { books };
    }

    /**
     * Get books by category
     * @param {string} category - The category to filter by
     * @param {number} [limit] - Maximum number of results
     * @param {number} [offset] - Number of results to skip
     * @returns {Promise<object>} The books in category
     */
    async getBooksByCategory(category, limit = 20, offset = 0) {
        if (!category) {
            throw new AppError('Categoría requerida', 400);
        }

        const books = await this.bookRepository.findByCategory(category, {
            include: {
                _count: {
                    select: {
                        reviews: true,
                        favorites: true,
                    },
                },
            },
            take: limit,
            skip: offset,
            orderBy: {
                title: 'asc',
            },
        });

        const totalCount = await this.bookRepository.count({ category });

        return {
            books,
            pagination: {
                total: totalCount,
                limit,
                offset,
                hasMore: offset + limit < totalCount,
            },
        };
    }

    /**
     * Get books by author
     * @param {string} author - The author to search for
     * @param {number} [limit] - Maximum number of results
     * @param {number} [offset] - Number of results to skip
     * @returns {Promise<object>} The books by author
     */
    async getBooksByAuthor(author, limit = 20, offset = 0) {
        if (!author) {
            throw new AppError('Autor requerido', 400);
        }

        const books = await this.bookRepository.findByAuthor(author, {
            include: {
                _count: {
                    select: {
                        reviews: true,
                        favorites: true,
                    },
                },
            },
            take: limit,
            skip: offset,
            orderBy: {
                title: 'asc',
            },
        });

        const totalCount = await this.bookRepository.count({
            author: {
                contains: author,
                mode: 'insensitive',
            },
        });

        return {
            books,
            pagination: {
                total: totalCount,
                limit,
                offset,
                hasMore: offset + limit < totalCount,
            },
        };
    }

    /**
     * Create a new book
     * @param {object} bookData - The book data to create
     * @returns {Promise<object>} The created book
     * @throws {AppError} If book data is invalid
     */
    async createBook(bookData) {
        const { id, title, author, imageUrl, description, rating, category } = bookData;

        // Validate required fields
        if (!id || !title || !author) {
            throw new AppError('ID, título y autor son requeridos', 400);
        }

        // Check if book already exists
        const existingBook = await this.bookRepository.findById(id);
        if (existingBook) {
            throw new AppError('El libro ya existe', 409);
        }

        const book = await this.bookRepository.create({
            id,
            title,
            author,
            imageUrl,
            description,
            rating,
            category,
        });

        return {
            message: 'Libro creado exitosamente',
            book,
        };
    }

    /**
     * Update book information
     * @param {string} bookId - The book ID
     * @param {object} updateData - The data to update
     * @returns {Promise<object>} The updated book
     * @throws {AppError} If book not found or data is invalid
     */
    async updateBook(bookId, updateData) {
        if (!bookId) {
            throw new AppError('ID del libro requerido', 400);
        }

        // Check if book exists
        const existingBook = await this.bookRepository.findById(bookId);
        if (!existingBook) {
            throw new AppError('Libro no encontrado', 404);
        }

        // Prepare update data (only include defined fields)
        const allowedFields = ['title', 'author', 'imageUrl', 'description', 'rating', 'category'];
        const filteredData = {};
        
        for (const field of allowedFields) {
            if (updateData[field] !== undefined) {
                filteredData[field] = updateData[field];
            }
        }

        const updatedBook = await this.bookRepository.updateById(bookId, filteredData);

        return {
            message: 'Libro actualizado exitosamente',
            book: updatedBook,
        };
    }

    /**
     * Delete a book
     * @param {string} bookId - The book ID
     * @returns {Promise<object>} The deletion result
     * @throws {AppError} If book not found
     */
    async deleteBook(bookId) {
        if (!bookId) {
            throw new AppError('ID del libro requerido', 400);
        }

        // Check if book exists
        const existingBook = await this.bookRepository.findById(bookId);
        if (!existingBook) {
            throw new AppError('Libro no encontrado', 404);
        }

        await this.bookRepository.deleteById(bookId);

        return { message: 'Libro eliminado exitosamente' };
    }

    /**
     * Build where clause for search criteria
     * @private
     * @param {object} searchCriteria - The search criteria
     * @returns {object} The where clause
     */
    _buildSearchWhereClause(searchCriteria) {
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

        return where;
    }
}

module.exports = BookService;
