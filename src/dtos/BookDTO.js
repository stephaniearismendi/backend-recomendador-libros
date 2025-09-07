/**
 * Book Data Transfer Objects (DTOs)
 * Defines the structure of book-related API responses
 */

/**
 * Book basic DTO
 * @param {object} book - Book data from database
 * @returns {object} Formatted book basic info
 */
const bookBasicDTO = (book) => {
    return {
        id: book.id,
        title: book.title,
        author: book.author,
        imageUrl: book.imageUrl,
        description: book.description,
        rating: book.rating,
        category: book.category,
    };
};

/**
 * Book with stats DTO
 * @param {object} book - Book data from database
 * @returns {object} Formatted book with statistics
 */
const bookWithStatsDTO = (book) => {
    return {
        id: book.id,
        title: book.title,
        author: book.author,
        imageUrl: book.imageUrl,
        description: book.description,
        rating: book.rating,
        category: book.category,
        stats: {
            reviews: book._count?.reviews || 0,
            favorites: book._count?.favorites || 0,
        },
    };
};

/**
 * Book detailed DTO
 * @param {object} book - Book data from database
 * @returns {object} Formatted detailed book info
 */
const bookDetailedDTO = (book) => {
    return {
        id: book.id,
        title: book.title,
        author: book.author,
        imageUrl: book.imageUrl,
        description: book.description,
        rating: book.rating,
        category: book.category,
        stats: {
            reviews: book._count?.reviews || 0,
            favorites: book._count?.favorites || 0,
        },
        averageRating: book.reviews?.length > 0 
            ? (book.reviews.reduce((sum, review) => sum + review.rating, 0) / book.reviews.length).toFixed(1)
            : null,
    };
};

/**
 * Book creation response DTO
 * @param {object} book - Created book data
 * @returns {object} Formatted creation response
 */
const bookCreationDTO = (book) => {
    return {
        message: 'Libro creado exitosamente',
        book: bookBasicDTO(book),
    };
};

/**
 * Book update response DTO
 * @param {object} book - Updated book data
 * @returns {object} Formatted update response
 */
const bookUpdateDTO = (book) => {
    return {
        message: 'Libro actualizado exitosamente',
        book: bookBasicDTO(book),
    };
};

/**
 * Book search results DTO
 * @param {Array} books - Array of books
 * @param {object} pagination - Pagination information
 * @returns {object} Formatted search results
 */
const bookSearchResultsDTO = (books, pagination) => {
    return {
        books: books.map(bookWithStatsDTO),
        pagination: {
            total: pagination.total,
            limit: pagination.limit,
            offset: pagination.offset,
            hasMore: pagination.hasMore,
        },
    };
};

/**
 * Book list response DTO
 * @param {Array} books - Array of books
 * @returns {object} Formatted book list
 */
const bookListDTO = (books) => {
    return {
        books: books.map(bookWithStatsDTO),
    };
};

/**
 * Book single response DTO
 * @param {object} book - Book data
 * @returns {object} Formatted single book response
 */
const bookSingleDTO = (book) => {
    return {
        book: bookDetailedDTO(book),
    };
};

/**
 * Success message DTO
 * @param {string} message - Success message
 * @returns {object} Formatted success response
 */
const successMessageDTO = (message) => {
    return { message };
};

module.exports = {
    bookBasicDTO,
    bookWithStatsDTO,
    bookDetailedDTO,
    bookCreationDTO,
    bookUpdateDTO,
    bookSearchResultsDTO,
    bookListDTO,
    bookSingleDTO,
    successMessageDTO,
};
