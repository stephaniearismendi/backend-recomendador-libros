const express = require('express');
const router = express.Router();
const recommenderController = require('../controllers/recommenderController');

router.post('/personal', recommenderController.getPersonalRecommendations);

module.exports = router;
