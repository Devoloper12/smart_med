const express = require('express');
const router = express.Router();
const prescriptionController = require('../controllers/prescriptionController');
const { authenticateToken } = require('../middlewares/authMiddleware');
const { uploadPrescription } = require('../middlewares/uploadMiddleware');

router.use(authenticateToken);
router.get('/', prescriptionController.getPrescriptions);
router.post('/', uploadPrescription.single('prescriptionFile'), prescriptionController.uploadPrescription);
router.get('/:id/download', prescriptionController.downloadPrescription);
router.delete('/:id', prescriptionController.deletePrescription);

module.exports = router;
