const express = require('express');
const router = express.Router();
const {
    searchBooks,
    getPopularBooks,
    getBooksByGenre,
    getBookDetails,
    getAdaptedBooks,
    getNYTBooks,
    getBookById,
} = require('../controllers/bookController');

const { getFavorites, addFavorite, removeFavorite } = require('../controllers/favoriteController');

router.get('/search', searchBooks);
router.get('/popular', getPopularBooks);
router.get('/genre', getBooksByGenre);
router.get('/adapted', getAdaptedBooks);
router.get('/nytBooks', getNYTBooks);

router.get('/favorites/:userId', getFavorites);
router.post('/addFavorite/:userId', addFavorite);
router.delete('/removeFavorite/:userId/:bookId', removeFavorite);

router.get('/:bookId', getBookById);
router.get('/:key/details', getBookDetails);

module.exports = router;
