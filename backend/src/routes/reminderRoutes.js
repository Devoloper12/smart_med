const express = require('express');
const router = express.Router();
const reminderController = require('../controllers/reminderController');
const { authenticateToken, authorizeRoles } = require('../middlewares/authMiddleware');

router.use(authenticateToken);
router.get('/', reminderController.getReminders);
router.post('/', authorizeRoles('patient'), reminderController.createReminder);
router.patch('/:id/taken', authorizeRoles('patient'), reminderController.markTaken);
router.patch('/:id/missed', authorizeRoles('patient'), reminderController.markMissed);
router.patch('/:id/snooze', authorizeRoles('patient'), reminderController.snoozeReminder);

module.exports = router;
