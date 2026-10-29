const express = require('express');
const router = express.Router();
const patientController = require('../controllers/patientController');
const { authenticateToken, authorizeRoles } = require('../middlewares/authMiddleware');

router.use(authenticateToken);
router.get('/profile', patientController.getPatientProfile);
router.put('/profile', authorizeRoles('patient'), patientController.updatePatientProfile);
router.get('/dashboard-stats', patientController.getDashboardStats);

// Caregiver & Patient Tracking Endpoints
router.get('/assigned', patientController.getAssignedPatients);
router.get('/tracking', patientController.getPatientTrackingData);
router.get('/reports', patientController.getPatientReports);
router.get('/messages', patientController.getMessages);
router.post('/messages', patientController.sendMessage);

module.exports = router;
