const mongoose = require('mongoose');
const ReminderModel = require('../models/Reminder');
const MedicineModel = require('../models/Medicine');
const CaregiverModel = require('../models/Caregiver');
const ReminderDomain = require('../classes/ReminderDomain');
const CaregiverDomain = require('../classes/CaregiverDomain');
const fallbackStore = require('../utils/fallbackStore');
const { resolvePatientId } = require('./patientController');

const isDBConnected = () => mongoose.connection.readyState === 1;

const getReminders = async (req, res, next) => {
  try {
    const patientId = await resolvePatientId(req);
    const { filter, status } = req.query;

    const now = new Date();
    const startOfToday = new Date(); startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date(); endOfToday.setHours(23, 59, 59, 999);

    if (isDBConnected()) {
      const patientMedicines = await MedicineModel.find({ patientId });
      const medicineIds = patientMedicines.map(m => m._id);

      const query = { medicineId: { $in: medicineIds } };
      if (filter === 'today') query.reminderTime = { $gte: startOfToday, $lte: endOfToday };
      else if (filter === 'upcoming') query.reminderTime = { $gt: now };
      else if (filter === 'history') query.status = { $in: ['taken', 'missed'] };

      if (status && status !== 'all') query.status = status;

      const reminders = await ReminderModel.find(query).populate('medicineId').sort({ reminderTime: filter === 'history' ? -1 : 1 });
      return res.status(200).json({ success: true, count: reminders.length, reminders });
    } else {
      const medicines = fallbackStore.medicines.filter(m => String(m.patientId) === String(patientId));
      const medicineIds = medicines.map(m => String(m._id));
      const reminders = fallbackStore.reminders.filter(r => medicineIds.includes(String(r.medicineId))).map(r => ({
        ...r,
        medicineId: medicines.find(m => String(m._id) === String(r.medicineId)) || {}
      }));
      return res.status(200).json({ success: true, count: reminders.length, reminders });
    }
  } catch (error) {
    next(error);
  }
};

const createReminder = async (req, res, next) => {
  try {
    const { medicineId, reminderTime, status = 'pending', notes = '' } = req.body;
    if (!medicineId || !reminderTime) {
      return res.status(400).json({ success: false, message: 'Medicine ID and reminder time are required.' });
    }

    if (isDBConnected()) {
      const reminderDomain = new ReminderDomain({ medicineId, reminderTime: new Date(reminderTime), status });
      const savedReminder = await reminderDomain.createReminder({ notes });
      return res.status(201).json({ success: true, message: 'Reminder created!', reminder: savedReminder });
    } else {
      const newRem = { _id: 'rem_' + Date.now(), medicineId, reminderTime, status, notes };
      fallbackStore.reminders.push(newRem);
      return res.status(201).json({ success: true, message: 'Reminder created!', reminder: newRem });
    }
  } catch (error) {
    next(error);
  }
};

const markTaken = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (isDBConnected()) {
      const reminderDomain = new ReminderDomain();
      const updated = await reminderDomain.markAsTaken(id);
      return res.status(200).json({ success: true, message: 'Medicine marked as taken!', reminder: updated });
    } else {
      const rem = fallbackStore.reminders.find(r => String(r._id) === String(id));
      if (rem) { rem.status = 'taken'; rem.takenAt = new Date().toISOString(); }
      return res.status(200).json({ success: true, message: 'Medicine marked as taken!', reminder: rem });
    }
  } catch (error) {
    next(error);
  }
};

const markMissed = async (req, res, next) => {
  try {
    const { id } = req.params;
    const patientId = await resolvePatientId(req);

    if (isDBConnected()) {
      const reminderDomain = new ReminderDomain();
      const updated = await reminderDomain.markAsMissed(id);
      const medicine = await MedicineModel.findById(updated.medicineId);

      const caregivers = await CaregiverModel.find({ patientId });
      caregivers.forEach(cg => {
        const cgDomain = new CaregiverDomain({ name: cg.name, phone: cg.phone, relationship: cg.relationship });
        cgDomain.receiveAlert({
          type: 'MISSED_MEDICINE',
          message: `Missed dose: ${medicine?.medicineName || 'Medication'}`,
          patientName: req.user.name
        });
      });

      return res.status(200).json({ success: true, message: 'Dose marked as missed. Caregivers notified.', reminder: updated });
    } else {
      const rem = fallbackStore.reminders.find(r => String(r._id) === String(id));
      if (rem) rem.status = 'missed';
      return res.status(200).json({ success: true, message: 'Dose marked as missed. Caregivers notified.', reminder: rem });
    }
  } catch (error) {
    next(error);
  }
};

const snoozeReminder = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { minutes = 15 } = req.body;
    const newTime = new Date(Date.now() + minutes * 60000);

    if (isDBConnected()) {
      const updated = await ReminderModel.findByIdAndUpdate(id, { reminderTime: newTime, status: 'snoozed' }, { new: true });
      return res.status(200).json({ success: true, message: `Snoozed for ${minutes} minutes.`, reminder: updated });
    } else {
      const rem = fallbackStore.reminders.find(r => String(r._id) === String(id));
      if (rem) { rem.reminderTime = newTime.toISOString(); rem.status = 'snoozed'; }
      return res.status(200).json({ success: true, message: `Snoozed for ${minutes} minutes.`, reminder: rem });
    }
  } catch (error) {
    next(error);
  }
};

module.exports = { getReminders, createReminder, markTaken, markMissed, snoozeReminder };
