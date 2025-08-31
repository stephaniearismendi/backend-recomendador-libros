const express = require('express');
const ctrl = require('../controllers/socialController');
const router = express.Router();

router.get('/feed', ctrl.getFeed);
router.post('/posts', ctrl.createPost);
router.post('/posts/:postId/like', ctrl.toggleLike);
router.post('/posts/:postId/comments', ctrl.addComment);

router.get('/clubs', ctrl.getClubs);
router.post('/clubs/:clubId/toggle', ctrl.toggleJoinClub);

router.get('/suggestions', ctrl.getSuggestions);
router.post('/follow/:userId/toggle', ctrl.toggleFollow);


module.exports = router;
