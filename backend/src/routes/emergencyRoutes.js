const express = require('express');
const router = express.Router();
const emergencyController = require('../controllers/emergencyController');
const { authenticateToken, authorizeRoles } = require('../middlewares/authMiddleware');

router.use(authenticateToken);
router.post('/sos', authorizeRoles('patient'), emergencyController.triggerSOS);
router.get('/', emergencyController.getEmergencyAlerts);
router.patch('/:id/resolve', emergencyController.resolveAlert);

module.exports = router;
