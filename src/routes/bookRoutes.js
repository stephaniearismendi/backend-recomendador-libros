const express = require('express');
const router = express.Router();
const {
    searchBooks,
    getFavorites,
    addFavorite,
    removeFavorite,
    getPopularBooks,
    getBooksByGenre,
    getBookDetails
} = require('../controllers/bookController');


router.get('/search', searchBooks);
router.get('/popular', getPopularBooks);
router.get('/genre', getBooksByGenre);

router.get('/:key/details', getBookDetails);

router.get('/favorites/:userId', getFavorites);
router.post('/addFavorite', addFavorite);
router.delete('/removeFavorite/:userId/:bookId', removeFavorite);

module.exports = router;
