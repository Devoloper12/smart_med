const express = require('express');
const router = express.Router();
const caregiverController = require('../controllers/caregiverController');
const { authenticateToken } = require('../middlewares/authMiddleware');

router.use(authenticateToken);
router.get('/', caregiverController.getCaregivers);
router.post('/', caregiverController.addCaregiver);
router.put('/:id', caregiverController.updateCaregiver);
router.delete('/:id', caregiverController.deleteCaregiver);
router.post('/:id/notify', caregiverController.notifyCaregiver);

module.exports = router;
