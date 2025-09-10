const express = require('express');
const router = express.Router();
const {
  getUserStats,
  getUserAchievements,
  updateReadingProgress,
  getReadingChallenge,
  setReadingChallenge,
  getAllAchievements
} = require('../controllers/gamificationController');
const authenticateToken = require('../middlewares/authMiddleware');

router.get('/stats/user/:userId', authenticateToken, getUserStats);
router.get('/achievements/user/:userId', authenticateToken, getUserAchievements);
router.get('/achievements', getAllAchievements);
router.post('/reading/progress', authenticateToken, updateReadingProgress);
router.get('/challenge/user/:userId/:year', authenticateToken, getReadingChallenge);
router.post('/challenge', authenticateToken, setReadingChallenge);

module.exports = router;
