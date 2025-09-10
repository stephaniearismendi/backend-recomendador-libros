/**
 * Favorite Data Transfer Objects (DTOs)
 * Defines the structure of favorite-related API responses
 */

const BookDTO = require('./BookDTO');

/**
 * Favorite book DTO
 * @param {object} book - Book data from database
 * @returns {object} Formatted favorite book with cover image
 */
const favoriteBookDTO = (book) => {
    const imageUrl = book.imageUrl || generateCoverUrl(book);
    
    return {
        ...BookDTO.bookBasicDTO(book),
        imageUrl,
        image: imageUrl,
        coverUrl: imageUrl,
        cover: imageUrl,
    };
};

/**
 * Favorite list DTO
 * @param {Array} favorites - Array of favorite objects with book data
 * @returns {Array} Formatted array of favorite books
 */
const favoriteListDTO = (favorites) => {
    return favorites
        .map(({ book }) => {
            if (!book) {
                console.warn('Favorite without book found');
                return null;
            }
            return favoriteBookDTO(book);
        })
        .filter(Boolean);
};

/**
 * Favorite response DTO
 * @param {boolean} success - Success status
 * @param {string} message - Optional message
 * @returns {object} Formatted favorite operation response
 */
const favoriteResponseDTO = (success, message = null) => {
    return {
        success,
        ...(message && { message })
    };
};

/**
 * Generate cover URL for book
 * @param {object} book - Book data
 * @returns {string|null} Generated cover URL or null
 */
function generateCoverUrl(book) {
    const direct = book.image || book.imageUrl || book.book_image || book.coverUrl || book.cover;
    if (direct) return direct;

    const isbn = getFirstIsbn(book);
    if (isbn) return `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg`;
    if (book.cover_i) return `https://covers.openlibrary.org/b/id/${book.cover_i}-L.jpg`;
    if (book.title) return `https://covers.openlibrary.org/b/title/${encodeURIComponent(book.title)}-L.jpg`;
    return null;
}

/**
 * Get first available ISBN from book data
 * @param {object} book - Book data
 * @returns {string|null} First available ISBN or null
 */
function getFirstIsbn(book) {
    if (Array.isArray(book.isbn) && book.isbn[0]) return String(book.isbn[0]);
    if (typeof book.primary_isbn13 === 'string' && book.primary_isbn13) return book.primary_isbn13;
    if (typeof book.primary_isbn10 === 'string' && book.primary_isbn10) return book.primary_isbn10;
    if (typeof book.isbn13 === 'string' && book.isbn13) return book.isbn13;
    if (typeof book.isbn10 === 'string' && book.isbn10) return book.isbn10;
    if (Array.isArray(book.isbns) && (book.isbns[0]?.isbn13 || book.isbns[0]?.isbn10)) {
        return book.isbns[0].isbn13 || book.isbns[0].isbn10;
    }
    return null;
}

module.exports = {
    favoriteBookDTO,
    favoriteListDTO,
    favoriteResponseDTO,
    generateCoverUrl,
    getFirstIsbn,
};
