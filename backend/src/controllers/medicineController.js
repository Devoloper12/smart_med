const mongoose = require('mongoose');
const MedicineModel = require('../models/Medicine');
const ReminderModel = require('../models/Reminder');
const MedicineDomain = require('../classes/MedicineDomain');
const fallbackStore = require('../utils/fallbackStore');
const { resolvePatientId } = require('./patientController');

const isDBConnected = () => mongoose.connection.readyState === 1;

const getMedicines = async (req, res, next) => {
  try {
    const patientId = await resolvePatientId(req);
    const { search, status } = req.query;

    if (isDBConnected()) {
      const query = { patientId };
      if (status && status !== 'all') query.status = status;
      if (search) query.medicineName = { $regex: search, $options: 'i' };

      const medicines = await MedicineModel.find(query).sort({ createdAt: -1 });
      return res.status(200).json({ success: true, count: medicines.length, medicines });
    } else {
      let medicines = fallbackStore.medicines.filter(m => String(m.patientId) === String(patientId));
      if (status && status !== 'all') medicines = medicines.filter(m => m.status.toLowerCase() === status.toLowerCase());
      if (search) medicines = medicines.filter(m => m.medicineName.toLowerCase().includes(search.toLowerCase()));

      return res.status(200).json({ success: true, count: medicines.length, medicines });
    }
  } catch (error) {
    next(error);
  }
};

const getMedicineById = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (isDBConnected()) {
      const medicine = await MedicineModel.findById(id);
      if (!medicine) return res.status(404).json({ success: false, message: 'Medicine not found.' });
      return res.status(200).json({ success: true, medicine });
    } else {
      const medicine = fallbackStore.medicines.find(m => String(m._id) === String(id));
      if (!medicine) return res.status(404).json({ success: false, message: 'Medicine not found.' });
      return res.status(200).json({ success: true, medicine });
    }
  } catch (error) {
    next(error);
  }
};

const createMedicine = async (req, res, next) => {
  try {
    const patientId = await resolvePatientId(req);
    const { medicineName, dosage, frequency, startDate, endDate, instructions, status } = req.body;

    if (!medicineName || !dosage || !frequency || !endDate) {
      return res.status(400).json({ success: false, message: 'Medicine name, dosage, frequency, and end date are required.' });
    }

    if (isDBConnected()) {
      const medicineDomain = new MedicineDomain({
        patientId,
        medicineName,
        dosage,
        frequency,
        startDate: startDate ? new Date(startDate) : new Date(),
        endDate: new Date(endDate),
        instructions,
        status: status || 'Active'
      });

      const savedMedicine = await medicineDomain.createMedicine();
      return res.status(201).json({ success: true, message: 'Medicine and schedule created successfully!', medicine: savedMedicine });
    } else {
      const newMed = {
        _id: 'med_' + Date.now(),
        patientId: String(patientId),
        medicineName,
        dosage,
        frequency,
        startDate: startDate ? new Date(startDate).toISOString() : new Date().toISOString(),
        endDate: new Date(endDate).toISOString(),
        instructions: instructions || 'Take with water after meal',
        status: status || 'Active'
      };
      fallbackStore.medicines.unshift(newMed);
      return res.status(201).json({ success: true, message: 'Medicine added successfully!', medicine: newMed });
    }
  } catch (error) {
    next(error);
  }
};

const updateMedicine = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { medicineName, dosage, frequency, startDate, endDate, instructions, status } = req.body;

    if (isDBConnected()) {
      const medicineDomain = new MedicineDomain({ id });
      const updatedMedicine = await medicineDomain.updateMedicine(id, {
        medicineName, dosage, frequency, startDate, endDate, instructions, status
      });
      return res.status(200).json({ success: true, message: 'Medicine updated successfully!', medicine: updatedMedicine });
    } else {
      const med = fallbackStore.medicines.find(m => String(m._id) === String(id));
      if (!med) return res.status(404).json({ success: false, message: 'Medicine not found.' });
      if (medicineName) med.medicineName = medicineName;
      if (dosage) med.dosage = dosage;
      if (frequency) med.frequency = frequency;
      if (startDate) med.startDate = new Date(startDate).toISOString();
      if (endDate) med.endDate = new Date(endDate).toISOString();
      if (instructions) med.instructions = instructions;
      if (status) med.status = status;
      return res.status(200).json({ success: true, message: 'Medicine updated successfully!', medicine: med });
    }
  } catch (error) {
    next(error);
  }
};

const deleteMedicine = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (isDBConnected()) {
      const deletedMed = await MedicineModel.findByIdAndDelete(id);
      if (!deletedMed) return res.status(404).json({ success: false, message: 'Medicine not found.' });
      await ReminderModel.deleteMany({ medicineId: id });
      return res.status(200).json({ success: true, message: 'Medicine and scheduled reminders deleted.' });
    } else {
      fallbackStore.medicines = fallbackStore.medicines.filter(m => String(m._id) !== String(id));
      fallbackStore.reminders = fallbackStore.reminders.filter(r => String(r.medicineId) !== String(id));
      return res.status(200).json({ success: true, message: 'Medicine and scheduled reminders deleted.' });
    }
  } catch (error) {
    next(error);
  }
};

module.exports = { getMedicines, getMedicineById, createMedicine, updateMedicine, deleteMedicine };
