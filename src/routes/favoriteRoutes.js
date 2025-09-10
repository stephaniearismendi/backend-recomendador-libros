const router = require('express').Router();
const ctrl = require('../controllers/favoriteController');
const { ValidationMiddleware } = require('../middlewares/validationMiddleware');

const validateUserId = ValidationMiddleware.validateId('userId', 'number');
const validateBookId = ValidationMiddleware.validateId('bookId', 'string');

router.get('/:userId', validateUserId, ctrl.getFavorites);
router.post('/:userId/:bookId', validateUserId, validateBookId, ctrl.addFavorite);
router.delete('/:userId/:bookId', validateUserId, validateBookId, ctrl.removeFavorite);

module.exports = router;
