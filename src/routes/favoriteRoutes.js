const router = require('express').Router();
const ctrl = require('../controllers/favoriteController');

router.get('/:userId', ctrl.getFavorites);
router.post('/:userId/:bookId', ctrl.addFavorite);
router.delete('/:userId/:bookId', ctrl.removeFavorite);

module.exports = router;
