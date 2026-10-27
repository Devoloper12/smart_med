const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const PrescriptionModel = require('../models/Prescription');
const fallbackStore = require('../utils/fallbackStore');
const { resolvePatientId } = require('./patientController');

const isDBConnected = () => mongoose.connection.readyState === 1;

const uploadPrescription = async (req, res, next) => {
  try {
    const patientId = await resolvePatientId(req);
    const { doctorName, prescriptionDate, notes } = req.body;

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please select a prescription file (PDF or Image) to upload.' });
    }

    if (!doctorName) {
      return res.status(400).json({ success: false, message: 'Doctor name is required.' });
    }

    const fileUrl = `/uploads/prescriptions/${req.file.filename}`;

    const prescriptionPayload = {
      patientId,
      fileUrl,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      fileSize: req.file.size,
      doctorName,
      prescriptionDate: prescriptionDate ? new Date(prescriptionDate) : new Date(),
      notes: notes || ''
    };

    if (isDBConnected()) {
      const doc = new PrescriptionModel(prescriptionPayload);
      const savedDoc = await doc.save();
      return res.status(201).json({ success: true, message: 'Prescription uploaded successfully!', prescription: savedDoc });
    } else {
      const newDoc = { _id: 'rx_' + Date.now(), ...prescriptionPayload, createdAt: new Date().toISOString() };
      fallbackStore.prescriptions.unshift(newDoc);
      return res.status(201).json({ success: true, message: 'Prescription uploaded successfully!', prescription: newDoc });
    }
  } catch (error) {
    next(error);
  }
};

const getPrescriptions = async (req, res, next) => {
  try {
    const patientId = await resolvePatientId(req);
    if (isDBConnected()) {
      const prescriptions = await PrescriptionModel.find({ patientId }).sort({ prescriptionDate: -1 });
      return res.status(200).json({ success: true, count: prescriptions.length, prescriptions });
    } else {
      const prescriptions = fallbackStore.prescriptions.filter(p => String(p.patientId) === String(patientId));
      return res.status(200).json({ success: true, count: prescriptions.length, prescriptions });
    }
  } catch (error) {
    next(error);
  }
};

const downloadPrescription = async (req, res, next) => {
  try {
    const { id } = req.params;
    let rx = isDBConnected() ? await PrescriptionModel.findById(id) : fallbackStore.prescriptions.find(p => String(p._id) === String(id));
    if (!rx) return res.status(404).json({ success: false, message: 'Prescription not found.' });

    const filename = path.basename(rx.fileUrl);
    const absoluteFilePath = path.join(__dirname, '../../uploads/prescriptions', filename);

    if (fs.existsSync(absoluteFilePath)) {
      return res.download(absoluteFilePath, rx.originalName || filename);
    } else {
      return res.status(404).json({ success: false, message: 'Prescription file not found on server.' });
    }
  } catch (error) {
    next(error);
  }
};

const deletePrescription = async (req, res, next) => {
  try {
    const { id } = req.params;
    let rx = isDBConnected() ? await PrescriptionModel.findByIdAndDelete(id) : null;
    if (!rx) {
      fallbackStore.prescriptions = fallbackStore.prescriptions.filter(p => String(p._id) !== String(id));
    }
    return res.status(200).json({ success: true, message: 'Prescription deleted successfully.' });
  } catch (error) {
    next(error);
  }
};

module.exports = { uploadPrescription, getPrescriptions, downloadPrescription, deletePrescription };
