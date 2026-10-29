const express = require('express');
const router = express.Router();
const medicineController = require('../controllers/medicineController');
const { authenticateToken, authorizeRoles } = require('../middlewares/authMiddleware');

router.use(authenticateToken);
router.get('/', medicineController.getMedicines);
router.get('/:id', medicineController.getMedicineById);
router.post('/', authorizeRoles('patient'), medicineController.createMedicine);
router.put('/:id', authorizeRoles('patient'), medicineController.updateMedicine);
router.delete('/:id', authorizeRoles('patient'), medicineController.deleteMedicine);

module.exports = router;
