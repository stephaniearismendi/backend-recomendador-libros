const express = require('express');
const router = express.Router();
const { addFavorite, removeFavorite } = require('../controllers/favoriteController');

router.post('/', addFavorite);
router.delete('/:userId/:bookId', removeFavorite);

module.exports = router;
