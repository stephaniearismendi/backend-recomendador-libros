const express = require('express');
const router = express.Router();
const { addFavorite, removeFavorite, getFavorites } = require('../controllers/favoriteController');
const authMiddleware = require('../middlewares/authMiddleware');

router.get('/:userId', authMiddleware, getFavorites);
router.post('/:userId/:bookId', authMiddleware, addFavorite);
router.delete('/:userId/:bookId', authMiddleware, removeFavorite);

module.exports = router;
