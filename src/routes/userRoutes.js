const express = require('express');
const router = express.Router();
const { register, login, getUserIdByEmail, getUserIdFromToken } = require('../controllers/userController');
const authMiddleware = require('../middlewares/authMiddleware');

router.post('/register', register);
router.post('/login', login);
router.get('/id', getUserIdByEmail);
router.get('/me', authMiddleware, getUserIdFromToken);

module.exports = router;
