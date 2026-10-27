const express = require('express');
const router = express.Router();
const emergencyController = require('../controllers/emergencyController');
const { authenticateToken } = require('../middlewares/authMiddleware');

router.use(authenticateToken);
router.post('/sos', emergencyController.triggerSOS);
router.get('/', emergencyController.getEmergencyAlerts);
router.patch('/:id/resolve', emergencyController.resolveAlert);

module.exports = router;
