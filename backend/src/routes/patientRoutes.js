const express = require('express');
const router = express.Router();
const patientController = require('../controllers/patientController');
const { authenticateToken, authorizeRoles } = require('../middlewares/authMiddleware');

router.use(authenticateToken);
router.get('/profile', patientController.getPatientProfile);
router.put('/profile', authorizeRoles('patient'), patientController.updatePatientProfile);
router.get('/dashboard-stats', patientController.getDashboardStats);

module.exports = router;
