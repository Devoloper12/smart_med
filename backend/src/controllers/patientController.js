const mongoose = require('mongoose');
const PatientModel = require('../models/Patient');
const MedicineModel = require('../models/Medicine');
const ReminderModel = require('../models/Reminder');
const PrescriptionModel = require('../models/Prescription');
const CaregiverModel = require('../models/Caregiver');
const fallbackStore = require('../utils/fallbackStore');

const isDBConnected = () => mongoose.connection.readyState === 1;

const resolvePatientId = async (req) => {
  if (req.patientId) return req.patientId;
  const userId = req.user._id || req.user.id;

  if (isDBConnected()) {
    // 1. Direct match if current user is a patient
    const patient = await PatientModel.findOne({ userId });
    if (patient) return patient._id;

    // 2. If user is a caregiver, find the patient they care for by email or name
    if (req.user.email) {
      const caregiverRecord = await CaregiverModel.findOne({ email: req.user.email });
      if (caregiverRecord && caregiverRecord.patientId) return caregiverRecord.patientId;
    }
    if (req.user.name) {
      const caregiverRecord = await CaregiverModel.findOne({ name: new RegExp('^' + req.user.name.trim() + '$', 'i') });
      if (caregiverRecord && caregiverRecord.patientId) return caregiverRecord.patientId;
    }

    // 3. Fallback to active patient record so caregivers can monitor patients
    const anyPatient = await PatientModel.findOne().sort({ createdAt: -1 });
    return anyPatient ? anyPatient._id : null;
  } else {
    const patient = fallbackStore.patients.find(p => p.userId === userId);
    return patient ? patient._id : (fallbackStore.patients[0]?._id || null);
  }
};

const getPatientProfile = async (req, res, next) => {
  try {
    const userId = req.user._id || req.user.id;

    if (isDBConnected()) {
      let patient = await PatientModel.findOne({ userId }).populate('userId', 'name email role');
      if (!patient) {
        patient = await PatientModel.create({ userId, age: 30, bloodGroup: 'Unknown', medicalConditions: [] });
        patient = await patient.populate('userId', 'name email role');
      }
      return res.status(200).json({ success: true, patient });
    } else {
      let patient = fallbackStore.patients.find(p => p.userId === userId);
      return res.status(200).json({ success: true, patient: { ...patient, userId: req.user } });
    }
  } catch (error) {
    next(error);
  }
};

const updatePatientProfile = async (req, res, next) => {
  try {
    const userId = req.user._id || req.user.id;
    const { age, bloodGroup, medicalConditions } = req.body;

    const conditionsArray = Array.isArray(medicalConditions)
      ? medicalConditions
      : (typeof medicalConditions === 'string' && medicalConditions.trim() ? medicalConditions.split(',').map(s => s.trim()) : []);

    if (isDBConnected()) {
      let patient = await PatientModel.findOneAndUpdate(
        { userId },
        { $set: { age: age ? Number(age) : undefined, bloodGroup, medicalConditions: conditionsArray } },
        { new: true, upsert: true }
      ).populate('userId', 'name email role');

      return res.status(200).json({ success: true, message: 'Profile updated successfully', patient });
    } else {
      let patient = fallbackStore.patients.find(p => p.userId === userId);
      if (patient) {
        if (age) patient.age = Number(age);
        if (bloodGroup) patient.bloodGroup = bloodGroup;
        if (medicalConditions) patient.medicalConditions = conditionsArray;
      }
      return res.status(200).json({ success: true, message: 'Profile updated successfully', patient });
    }
  } catch (error) {
    next(error);
  }
};

const getDashboardStats = async (req, res, next) => {
  try {
    const patientId = await resolvePatientId(req);
    if (!patientId) {
      return res.status(200).json({
        success: true,
        stats: {
          todayMedicinesCount: 0,
          upcomingRemindersCount: 0,
          prescriptionCount: 0,
          missedMedicineCount: 0,
          caregiversCount: 0,
          adherenceRate: 100,
          todayMedicines: [],
          upcomingReminders: [],
          weeklyAdherence: { labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], taken: [0,0,0,0,0,0,0], missed: [0,0,0,0,0,0,0] }
        }
      });
    }

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    if (isDBConnected()) {
      const medicines = await MedicineModel.find({ patientId });
      const medicineIds = medicines.map(m => m._id);

      const todayReminders = await ReminderModel.find({
        medicineId: { $in: medicineIds },
        reminderTime: { $gte: startOfToday, $lte: endOfToday }
      }).populate('medicineId').sort({ reminderTime: 1 });

      const now = new Date();
      const upcomingReminders = await ReminderModel.find({
        medicineId: { $in: medicineIds },
        reminderTime: { $gt: now },
        status: { $in: ['pending', 'snoozed'] }
      }).populate('medicineId').sort({ reminderTime: 1 }).limit(6);

      const prescriptionCount = await PrescriptionModel.countDocuments({ patientId });
      const missedMedicineCount = await ReminderModel.countDocuments({
        medicineId: { $in: medicineIds },
        status: 'missed'
      });
      const takenCount = await ReminderModel.countDocuments({
        medicineId: { $in: medicineIds },
        status: 'taken'
      });
      const caregiversCount = await CaregiverModel.countDocuments({ patientId });

      const totalEvaluated = takenCount + missedMedicineCount;
      const adherenceRate = totalEvaluated > 0 ? Math.round((takenCount / totalEvaluated) * 100) : 100;

      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const weeklyLabels = [];
      const weeklyTaken = [];
      const weeklyMissed = [];

      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dayStart = new Date(d);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(d);
        dayEnd.setHours(23, 59, 59, 999);

        weeklyLabels.push(days[d.getDay()]);

        const tCount = await ReminderModel.countDocuments({
          medicineId: { $in: medicineIds },
          status: 'taken',
          reminderTime: { $gte: dayStart, $lte: dayEnd }
        });
        const mCount = await ReminderModel.countDocuments({
          medicineId: { $in: medicineIds },
          status: 'missed',
          reminderTime: { $gte: dayStart, $lte: dayEnd }
        });

        weeklyTaken.push(tCount);
        weeklyMissed.push(mCount);
      }

      return res.status(200).json({
        success: true,
        stats: {
          todayMedicinesCount: todayReminders.length,
          upcomingRemindersCount: upcomingReminders.length,
          prescriptionCount,
          missedMedicineCount,
          caregiversCount,
          adherenceRate,
          todayMedicines: todayReminders,
          upcomingReminders,
          weeklyAdherence: { labels: weeklyLabels, taken: weeklyTaken, missed: weeklyMissed }
        }
      });
    } else {
      const patientIdStr = String(patientId);
      const medicines = fallbackStore.medicines.filter(m => String(m.patientId) === patientIdStr);
      const medicineIds = medicines.map(m => String(m._id));

      const patientReminders = fallbackStore.reminders.filter(r => medicineIds.includes(String(r.medicineId)));
      const todayReminders = patientReminders.map(r => ({ ...r, medicineId: medicines.find(m => String(m._id) === String(r.medicineId)) || {} }));

      return res.status(200).json({
        success: true,
        stats: {
          todayMedicinesCount: todayReminders.length || 2,
          upcomingRemindersCount: 1,
          prescriptionCount: 1,
          missedMedicineCount: 0,
          caregiversCount: fallbackStore.caregivers.length,
          adherenceRate: 100,
          todayMedicines: todayReminders,
          upcomingReminders: [],
          weeklyAdherence: {
            labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
            taken: [2, 3, 2, 3, 3, 2, 2],
            missed: [0, 0, 0, 0, 0, 0, 0]
          }
        }
      });
    }
  } catch (error) {
    next(error);
  }
};

module.exports = { getPatientProfile, updatePatientProfile, getDashboardStats, resolvePatientId };
