// src/routes/socialRoutes.js
const express = require('express');
const socialCtrl = require('../controllers/socialController');
const clubCtrl = require('../controllers/clubRoomController');
const auth = require('../middlewares/authMiddleware');

const router = express.Router();

/* --------- Social feed --------- */
router.get('/feed', socialCtrl.getFeed);
router.post('/posts', auth, socialCtrl.createPost);
router.delete('/posts/:postId', auth, socialCtrl.deletePost);
router.post('/posts/:postId/like', auth, socialCtrl.toggleLike);
router.post('/posts/:postId/comments', auth, socialCtrl.addComment);

/* --------- Clubs (lista y unirse) --------- */
router.get('/clubs', socialCtrl.getClubs);
router.post('/clubs/:clubId/toggle', auth, socialCtrl.toggleJoinClub);

/* --------- Sugerencias y follow --------- */
router.get('/suggestions', auth, socialCtrl.getSuggestions);
router.get('/suggestions-no-auth', socialCtrl.getSuggestionsNoAuth); // Temporal para testing
router.get('/suggestions-temp', socialCtrl.getSuggestionsTemp); // Temporal con filtrado
router.get('/users', socialCtrl.getAllUsers); // Endpoint simple para obtener todos los usuarios
router.get('/users/:userId/followers', socialCtrl.getFollowers); // Obtener seguidores de un usuario
router.get('/users/:userId/following', socialCtrl.getFollowing); // Obtener usuarios que sigue
router.post('/follow/:userId/toggle', auth, socialCtrl.toggleFollow);
router.post('/follow/:userId', auth, socialCtrl.followUser);
router.delete('/follow/:userId', auth, socialCtrl.unfollowUser);
router.get('/follow/:userId/status', auth, socialCtrl.getFollowStatus);

/* --------- Salas por capítulos --------- */
router.post('/clubs', auth, socialCtrl.createClub);
router.get('/clubs/:clubId', clubCtrl.getClub);
router.get('/clubs/:clubId/chapters', clubCtrl.listChapters);
router.post('/clubs/:clubId/chapters', auth, clubCtrl.createChapter);
router.get('/clubs/:clubId/chapters/:chapter/comments', clubCtrl.listComments);
router.post('/clubs/:clubId/chapters/:chapter/comments', auth, clubCtrl.postMessage);
router.post('/clubs/:clubId/toggle', auth, socialCtrl.toggleJoinClub);
router.post('/clubs/:clubId/generate-comments', auth, socialCtrl.generateChapterComments);

/* --------- Stories --------- */
router.post('/stories', auth, socialCtrl.createStory);
router.get('/stories', auth, socialCtrl.getStories);
router.get('/stories/user/:userId', socialCtrl.getUserStories);
router.post('/stories/clean', auth, socialCtrl.cleanExpiredStories);
router.post('/stories/seed', socialCtrl.seedStories);

module.exports = router;
