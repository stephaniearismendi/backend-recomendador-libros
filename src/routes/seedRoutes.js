const express = require('express');
const router = express.Router();
const seedCtrl = require('../controllers/seedController');

router.post('/users', seedCtrl.seedUsers);
router.get('/users/random', seedCtrl.getRandomUsers);
router.delete('/users/test', seedCtrl.clearTestUsers);
router.get('/status', seedCtrl.getSeedStatus);

module.exports = router;
