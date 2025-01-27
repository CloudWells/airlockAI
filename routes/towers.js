const express = require('express');
const router = express.Router();
const towerController = require('../controllers/towerController');

router.post('/', towerController.createTower);
router.get('/', towerController.getAllTowers);
router.get('/:id', towerController.getTowerById);
router.put('/:id', towerController.updateTower);
router.delete('/:id', towerController.deleteTower);

module.exports = router;