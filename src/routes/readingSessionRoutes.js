const express = require('express');
const router = express.Router();
const {
    startSession,
    updateProgress,
    endSession,
    getActiveSession,
    getUserSessions
} = require('../controllers/readingSessionController');
const authMiddleware = require('../middlewares/authMiddleware');
const { ValidationMiddleware } = require('../middlewares/validationMiddleware');

router.use(authMiddleware);

router.post('/start', ValidationMiddleware.validateBody('readingSession.start'), startSession);
router.put('/update', ValidationMiddleware.validateBody('readingSession.update'), updateProgress);
router.put('/end', ValidationMiddleware.validateBody('readingSession.end'), endSession);
router.get('/active/:bookId', getActiveSession);
router.get('/history', getUserSessions);

module.exports = router;
