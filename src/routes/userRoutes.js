const express = require('express');
const router = express.Router();
const { 
    register, 
    login, 
    getUserIdByEmail, 
    getUserIdFromToken,
    getProfile,
    updateProfile,
    updateAvatar,
    changePassword,
    deleteUser
} = require('../controllers/userController');
const authMiddleware = require('../middlewares/authMiddleware');

router.post('/register', register);
router.post('/login', login);
router.get('/id', getUserIdByEmail);
router.get('/me', authMiddleware, getUserIdFromToken);

// Rutas de perfil (requieren autenticación)
router.get('/profile', authMiddleware, getProfile);
router.put('/profile', authMiddleware, updateProfile);
router.put('/avatar', authMiddleware, updateAvatar);
router.put('/password', authMiddleware, changePassword);
router.delete('/account', authMiddleware, deleteUser);

module.exports = router;
