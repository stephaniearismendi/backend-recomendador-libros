const FavoriteRepository = require('../repositories/FavoriteRepository');
const BookRepository = require('../repositories/BookRepository');
const FavoriteDTO = require('../dtos/FavoriteDTO');
const AppError = require('../errors/AppError');
const prisma = require('../database/prisma');

class FavoriteService {
    constructor() {
        this.favoriteRepository = new FavoriteRepository();
        this.bookRepository = new BookRepository();
    }

    /**
     * Get user's favorite books
     * @param {number} userId - The user ID
     * @returns {Promise<object>} The user's favorite books
     * @throws {AppError} If userId is invalid
     */
    async getFavorites(userId) {
        if (!Number.isInteger(userId)) {
            throw new AppError('userId inválido', 400);
        }

        const favorites = await this.favoriteRepository.findByUserId(userId);
        return FavoriteDTO.favoriteListDTO(favorites);
    }

    /**
     * Add a book to user's favorites
     * @param {number} userId - The user ID
     * @param {object} bookData - The book data to add
     * @param {string} [bookData.id] - Book ID
     * @param {string} [bookData.title] - Book title
     * @param {string} [bookData.author] - Book author
     * @param {string} [bookData.description] - Book description
     * @param {number} [bookData.rating] - Book rating
     * @param {string} [bookData.category] - Book category
     * @returns {Promise<object>} The favorite response
     * @throws {AppError} If userId is invalid or book data is insufficient
     */
    async addFavorite(userId, bookData) {
        if (!Number.isInteger(userId)) {
            throw new AppError('userId inválido', 400);
        }

        const bookId = this.generateBookId(bookData);
        
        if (!bookId) {
            throw new AppError('Datos del libro insuficientes', 400);
        }

        const imageUrl = FavoriteDTO.generateCoverUrl(bookData);

        await prisma.book.upsert({
            where: { id: bookId },
            update: {
                title: bookData.title ?? undefined,
                author: bookData.author ?? undefined,
                imageUrl: imageUrl ?? undefined,
                description: bookData.description ?? undefined,
                rating: bookData.rating ? String(bookData.rating) : undefined,
                category: bookData.category ?? undefined,
            },
            create: {
                id: bookId,
                title: bookData.title || 'Libro sin título',
                author: bookData.author || 'Autor desconocido',
                imageUrl: imageUrl || null,
                description: bookData.description ?? null,
                rating: bookData.rating ? String(bookData.rating) : null,
                category: bookData.category ?? null,
            },
        });

        const existingFavorite = await this.favoriteRepository.userHasFavorite(userId, bookId);
        if (existingFavorite) {
            return FavoriteDTO.favoriteResponseDTO(true, 'Favorito ya existe');
        }

        await this.favoriteRepository.createFavorite(userId, bookId);
        return FavoriteDTO.favoriteResponseDTO(true);
    }

    /**
     * Remove a book from user's favorites
     * @param {number} userId - The user ID
     * @param {string} bookId - The book ID to remove
     * @returns {Promise<object>} The removal response
     * @throws {AppError} If parameters are invalid
     */
    async removeFavorite(userId, bookId) {
        if (!Number.isInteger(userId) || !bookId) {
            throw new AppError('Parámetros inválidos', 400);
        }

        const normalizedBookId = this.normalizeBookId(bookId);
        const possibleIds = this.generatePossibleIds(normalizedBookId, bookId);

        let existingFavorite = null;
        let correctBookId = null;

        for (const id of possibleIds) {
            existingFavorite = await this.favoriteRepository.findByUserAndBook(userId, id);
            if (existingFavorite) {
                correctBookId = id;
                break;
            }
        }

        if (!existingFavorite) {
            return FavoriteDTO.favoriteResponseDTO(true, 'Favorito ya eliminado');
        }

        await this.favoriteRepository.deleteFavorite(userId, correctBookId);
        return FavoriteDTO.favoriteResponseDTO(true);
    }

    /**
     * Generate a book ID from book data
     * @param {object} bookData - The book data
     * @param {string} [bookData.id] - Existing book ID
     * @param {string} [bookData.title] - Book title
     * @param {string} [bookData.author] - Book author
     * @returns {string|null} The generated book ID or null
     */
    generateBookId(bookData) {
        if (bookData.id) return bookData.id;
        if (bookData.title && bookData.author) {
            return `/books/${encodeURIComponent(bookData.title)}-${encodeURIComponent(bookData.author)}`;
        }
        return null;
    }


    /**
     * Normalize book ID format
     * @param {string} raw - Raw book ID
     * @returns {string} Normalized book ID
     */
    normalizeBookId(raw) {
        const decoded = this.safeDecode(raw);
        if (!decoded) return '';
        return decoded.startsWith('/') ? decoded : '/' + decoded;
    }

    /**
     * Safely decode URI component
     * @param {string} str - String to decode
     * @returns {string} Decoded string or original if decode fails
     */
    safeDecode(str) {
        try {
            return decodeURIComponent(String(str ?? ''));
        } catch {
            return String(str ?? '');
        }
    }

    /**
     * Generate possible book ID variations for matching
     * @param {string} normalizedId - Normalized book ID
     * @param {string} originalId - Original book ID
     * @returns {string[]} Array of possible book IDs
     */
    generatePossibleIds(normalizedId, originalId) {
        return [
            normalizedId,
            normalizedId.startsWith('/') ? normalizedId.substring(1) : '/' + normalizedId,
            originalId,
            originalId.startsWith('/') ? originalId.substring(1) : '/' + originalId,
        ].filter((id, index, arr) => arr.indexOf(id) === index);
    }
}

module.exports = FavoriteService;
