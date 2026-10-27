const express = require('express');
const router = express.Router();
const reminderController = require('../controllers/reminderController');
const { authenticateToken } = require('../middlewares/authMiddleware');

router.use(authenticateToken);
router.get('/', reminderController.getReminders);
router.post('/', reminderController.createReminder);
router.patch('/:id/taken', reminderController.markTaken);
router.patch('/:id/missed', reminderController.markMissed);
router.patch('/:id/snooze', reminderController.snoozeReminder);

module.exports = router;
