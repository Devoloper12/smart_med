const express = require('express');
const router = express.Router();
const caregiverController = require('../controllers/caregiverController');
const { authenticateToken, authorizeRoles } = require('../middlewares/authMiddleware');

router.use(authenticateToken);
router.get('/', caregiverController.getCaregivers);
router.post('/', authorizeRoles('patient'), caregiverController.addCaregiver);
router.put('/:id', authorizeRoles('patient'), caregiverController.updateCaregiver);
router.delete('/:id', authorizeRoles('patient'), caregiverController.deleteCaregiver);
router.post('/:id/notify', caregiverController.notifyCaregiver);

module.exports = router;
