const mongoose = require('mongoose');
const PatientModel = require('../models/Patient');
const MedicineModel = require('../models/Medicine');
const ReminderModel = require('../models/Reminder');
const PrescriptionModel = require('../models/Prescription');
const CaregiverModel = require('../models/Caregiver');
const EmergencyAlertModel = require('../models/EmergencyAlert');
const MessageModel = require('../models/Message');
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
    const isCaregiver = req.user && req.user.role === 'caregiver';
    const patientId = await resolvePatientId(req);

    if (isDBConnected()) {
      let patient = null;
      if (isCaregiver && patientId) {
        patient = await PatientModel.findById(patientId).populate('userId', 'name email role');
      } else {
        const userId = req.user._id || req.user.id;
        patient = await PatientModel.findOne({ userId }).populate('userId', 'name email role');
        if (!patient && req.user.role === 'patient') {
          patient = await PatientModel.create({ userId, age: 30, bloodGroup: 'Unknown', medicalConditions: [] });
          patient = await patient.populate('userId', 'name email role');
        }
      }
      return res.status(200).json({ success: true, patient, isCaregiverMonitoring: isCaregiver });
    } else {
      let patient = null;
      if (isCaregiver && patientId) {
        patient = fallbackStore.patients.find(p => String(p._id) === String(patientId));
      } else {
        const userId = req.user._id || req.user.id;
        patient = fallbackStore.patients.find(p => p.userId === userId) || fallbackStore.patients[0];
      }
      return res.status(200).json({ success: true, patient: { ...patient, userId: patient?.userId || req.user }, isCaregiverMonitoring: isCaregiver });
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
    const isCaregiver = req.user && req.user.role === 'caregiver';
    const patientId = await resolvePatientId(req);

    let monitoredPatient = null;
    if (patientId) {
      if (isDBConnected()) {
        const patientDoc = await PatientModel.findById(patientId).populate('userId', 'name email role');
        if (patientDoc) {
          monitoredPatient = {
            id: patientDoc._id,
            name: patientDoc.userId?.name || 'Patient',
            email: patientDoc.userId?.email || '',
            age: patientDoc.age,
            bloodGroup: patientDoc.bloodGroup,
            medicalConditions: patientDoc.medicalConditions || []
          };
        }
      } else {
        const p = fallbackStore.patients.find(pt => String(pt._id) === String(patientId)) || fallbackStore.patients[0];
        if (p) {
          monitoredPatient = {
            id: p._id,
            name: 'Patient User',
            email: 'patient@smartmed.com',
            age: p.age || 35,
            bloodGroup: p.bloodGroup || 'O+',
            medicalConditions: p.medicalConditions || []
          };
        }
      }
    }

    if (!patientId) {
      return res.status(200).json({
        success: true,
        isCaregiver,
        monitoredPatient,
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
        isCaregiver,
        monitoredPatient,
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
        isCaregiver,
        monitoredPatient,
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

const getAssignedPatients = async (req, res, next) => {
  try {
    const isCaregiver = req.user && req.user.role === 'caregiver';
    let patientIds = [];

    if (isDBConnected()) {
      if (isCaregiver) {
        const queryOr = [];
        if (req.user.email) queryOr.push({ email: req.user.email });
        if (req.user.name) queryOr.push({ name: new RegExp('^' + req.user.name.trim() + '$', 'i') });

        if (queryOr.length > 0) {
          const cgRecords = await CaregiverModel.find({ $or: queryOr });
          patientIds = cgRecords.map(c => c.patientId).filter(Boolean);
        }
      }

      if (patientIds.length === 0) {
        const defaultId = await resolvePatientId(req);
        if (defaultId) patientIds.push(defaultId);
      }

      if (patientIds.length === 0) {
        const anyPatients = await PatientModel.find().limit(5);
        patientIds = anyPatients.map(p => p._id);
      }

      const patientsData = [];
      for (const pId of patientIds) {
        const patientDoc = await PatientModel.findById(pId).populate('userId', 'name email');
        if (!patientDoc) continue;

        const medicines = await MedicineModel.find({ patientId: pId });
        const medicineIds = medicines.map(m => m._id);

        const takenCount = await ReminderModel.countDocuments({ medicineId: { $in: medicineIds }, status: 'taken' });
        const missedCount = await ReminderModel.countDocuments({ medicineId: { $in: medicineIds }, status: 'missed' });
        const total = takenCount + missedCount;
        const adherenceRate = total > 0 ? Math.round((takenCount / total) * 100) : 100;

        const activeSOS = await EmergencyAlertModel.findOne({ patientId: pId, status: 'triggered' });
        const latestAlert = await EmergencyAlertModel.findOne({ patientId: pId }).sort({ createdAt: -1 });
        const location = latestAlert?.location?.address || 'Registered Residence, Flat 402, Green Avenue, Bangalore';

        let status = 'Stable';
        let statusBadge = 'success';
        if (activeSOS) {
          status = 'Critical SOS';
          statusBadge = 'danger';
        } else if (missedCount > 2) {
          status = 'Needs Attention';
          statusBadge = 'warning';
        } else if (adherenceRate >= 80) {
          status = 'Good Compliance';
          statusBadge = 'success';
        }

        const latestReminder = await ReminderModel.findOne({ medicineId: { $in: medicineIds }, status: 'taken' }).sort({ updatedAt: -1 });
        const lastActive = latestReminder?.updatedAt || patientDoc.updatedAt || new Date(Date.now() - 25 * 60000);

        patientsData.push({
          patientId: patientDoc._id,
          name: patientDoc.userId?.name || 'Patient User',
          email: patientDoc.userId?.email || 'patient@smartmed.com',
          age: patientDoc.age,
          bloodGroup: patientDoc.bloodGroup,
          medicalConditions: patientDoc.medicalConditions || [],
          adherenceRate,
          missedCount,
          activeMedicinesCount: medicines.filter(m => m.status === 'Active').length,
          status,
          statusBadge,
          location,
          lastActive,
          hasActiveSOS: Boolean(activeSOS),
          activeSOSAlert: activeSOS
        });
      }

      return res.status(200).json({ success: true, count: patientsData.length, patients: patientsData });
    } else {
      const p = fallbackStore.patients[0];
      const activeSOS = fallbackStore.emergencyAlerts.find(a => a.status === 'triggered');
      const patientsData = [{
        patientId: p?._id || 'demo_pat_1',
        name: 'John Doe',
        email: 'patient@demo.com',
        age: p?.age || 48,
        bloodGroup: p?.bloodGroup || 'O+',
        medicalConditions: p?.medicalConditions || ['Hypertension', 'Type 2 Diabetes'],
        adherenceRate: 94,
        missedCount: 1,
        activeMedicinesCount: fallbackStore.medicines.length || 1,
        status: activeSOS ? 'Critical SOS' : 'Stable',
        statusBadge: activeSOS ? 'danger' : 'success',
        location: 'Registered Residence, Flat 402, Green Avenue, Bangalore',
        lastActive: new Date(Date.now() - 18 * 60000).toISOString(),
        hasActiveSOS: Boolean(activeSOS),
        activeSOSAlert: activeSOS
      }];

      return res.status(200).json({ success: true, count: patientsData.length, patients: patientsData });
    }
  } catch (error) {
    next(error);
  }
};

const getPatientTrackingData = async (req, res, next) => {
  try {
    const patientId = req.query.patientId || await resolvePatientId(req);
    const startOfToday = new Date(); startOfToday.setHours(0,0,0,0);
    const endOfToday = new Date(); endOfToday.setHours(23,59,59,999);
    const now = new Date();

    if (isDBConnected()) {
      const patientDoc = await PatientModel.findById(patientId).populate('userId', 'name email');
      if (!patientDoc) return res.status(404).json({ success: false, message: 'Patient not found' });

      const medicines = await MedicineModel.find({ patientId });
      const medicineIds = medicines.map(m => m._id);

      const allReminders = await ReminderModel.find({ medicineId: { $in: medicineIds } }).populate('medicineId').sort({ reminderTime: 1 });

      const todayReminders = allReminders.filter(r => new Date(r.reminderTime) >= startOfToday && new Date(r.reminderTime) <= endOfToday);
      const missedMedicines = allReminders.filter(r => r.status === 'missed').reverse().slice(0, 8);
      const upcomingMedicines = allReminders.filter(r => (r.status === 'pending' || r.status === 'snoozed') && new Date(r.reminderTime) >= now).slice(0, 6);

      const takenCount = allReminders.filter(r => r.status === 'taken').length;
      const missedCount = allReminders.filter(r => r.status === 'missed').length;
      const total = takenCount + missedCount;
      const adherenceRate = total > 0 ? Math.round((takenCount / total) * 100) : 100;

      const activeSOS = await EmergencyAlertModel.findOne({ patientId, status: 'triggered' });
      const latestSOS = await EmergencyAlertModel.findOne({ patientId }).sort({ createdAt: -1 });

      const latestTaken = allReminders.filter(r => r.status === 'taken').pop();
      const lastActive = latestTaken?.updatedAt || patientDoc.updatedAt || new Date(Date.now() - 15 * 60000);

      const location = {
        address: latestSOS?.location?.address || 'Registered Residence, Flat 402, Green Avenue, Bangalore',
        latitude: latestSOS?.location?.latitude || 12.9716,
        longitude: latestSOS?.location?.longitude || 77.5946,
        updatedAt: latestSOS?.createdAt || new Date()
      };

      return res.status(200).json({
        success: true,
        patient: {
          id: patientDoc._id,
          name: patientDoc.userId?.name || 'Patient',
          email: patientDoc.userId?.email || '',
          age: patientDoc.age,
          bloodGroup: patientDoc.bloodGroup,
          medicalConditions: patientDoc.medicalConditions || []
        },
        tracking: {
          adherenceRate,
          status: activeSOS ? 'Critical SOS' : missedCount > 2 ? 'Needs Attention' : 'Stable',
          statusBadge: activeSOS ? 'danger' : missedCount > 2 ? 'warning' : 'success',
          lastActive,
          location,
          hasActiveSOS: Boolean(activeSOS),
          activeSOS,
          todayDoses: todayReminders,
          missedMedicines,
          upcomingMedicines,
          totalMedicinesCount: medicines.length
        }
      });
    } else {
      const p = fallbackStore.patients[0];
      const medicines = fallbackStore.medicines;
      const reminders = fallbackStore.reminders;
      const activeSOS = fallbackStore.emergencyAlerts.find(a => a.status === 'triggered');

      return res.status(200).json({
        success: true,
        patient: {
          id: p?._id || 'demo_pat_1',
          name: 'John Doe',
          email: 'patient@demo.com',
          age: 48,
          bloodGroup: 'O+',
          medicalConditions: ['Hypertension', 'Type 2 Diabetes']
        },
        tracking: {
          adherenceRate: 94,
          status: activeSOS ? 'Critical SOS' : 'Stable',
          statusBadge: activeSOS ? 'danger' : 'success',
          lastActive: new Date(Date.now() - 15 * 60000).toISOString(),
          location: {
            address: 'Registered Residence, Flat 402, Green Avenue, Bangalore',
            latitude: 12.9716,
            longitude: 77.5946,
            updatedAt: new Date().toISOString()
          },
          hasActiveSOS: Boolean(activeSOS),
          activeSOS,
          todayDoses: reminders,
          missedMedicines: reminders.filter(r => r.status === 'missed'),
          upcomingMedicines: reminders.filter(r => r.status === 'pending'),
          totalMedicinesCount: medicines.length
        }
      });
    }
  } catch (error) {
    next(error);
  }
};

const getPatientReports = async (req, res, next) => {
  try {
    const patientId = req.query.patientId || await resolvePatientId(req);

    if (isDBConnected()) {
      const patientDoc = await PatientModel.findById(patientId).populate('userId', 'name email');
      const medicines = await MedicineModel.find({ patientId });
      const medicineIds = medicines.map(m => m._id);

      const reminders = await ReminderModel.find({ medicineId: { $in: medicineIds } }).populate('medicineId');
      const taken = reminders.filter(r => r.status === 'taken');
      const missed = reminders.filter(r => r.status === 'missed');
      const pending = reminders.filter(r => r.status === 'pending' || r.status === 'snoozed');

      const total = taken.length + missed.length;
      const adherenceRate = total > 0 ? Math.round((taken.length / total) * 100) : 100;

      // 7-day adherence breakdown
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const weeklyLabels = [];
      const weeklyTaken = [];
      const weeklyMissed = [];

      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dayStart = new Date(d); dayStart.setHours(0,0,0,0);
        const dayEnd = new Date(d); dayEnd.setHours(23,59,59,999);
        weeklyLabels.push(days[d.getDay()]);

        const t = reminders.filter(r => r.status === 'taken' && new Date(r.reminderTime) >= dayStart && new Date(r.reminderTime) <= dayEnd).length;
        const m = reminders.filter(r => r.status === 'missed' && new Date(r.reminderTime) >= dayStart && new Date(r.reminderTime) <= dayEnd).length;
        weeklyTaken.push(t);
        weeklyMissed.push(m);
      }

      return res.status(200).json({
        success: true,
        patient: {
          name: patientDoc?.userId?.name || 'Patient',
          email: patientDoc?.userId?.email || '',
          age: patientDoc?.age,
          bloodGroup: patientDoc?.bloodGroup,
          medicalConditions: patientDoc?.medicalConditions || []
        },
        report: {
          totalScheduled: reminders.length,
          takenCount: taken.length,
          missedCount: missed.length,
          pendingCount: pending.length,
          adherenceRate,
          weeklyLabels,
          weeklyTaken,
          weeklyMissed,
          auditLog: reminders.slice(0, 15)
        }
      });
    } else {
      return res.status(200).json({
        success: true,
        patient: {
          name: 'John Doe',
          email: 'patient@demo.com',
          age: 48,
          bloodGroup: 'O+',
          medicalConditions: ['Hypertension', 'Type 2 Diabetes']
        },
        report: {
          totalScheduled: 28,
          takenCount: 26,
          missedCount: 2,
          pendingCount: 0,
          adherenceRate: 93,
          weeklyLabels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
          weeklyTaken: [4, 4, 3, 4, 4, 3, 4],
          weeklyMissed: [0, 0, 1, 0, 0, 1, 0],
          auditLog: fallbackStore.reminders
        }
      });
    }
  } catch (error) {
    next(error);
  }
};

const getMessages = async (req, res, next) => {
  try {
    const patientId = req.query.patientId || await resolvePatientId(req);
    if (isDBConnected()) {
      const messages = await MessageModel.find({ patientId }).sort({ createdAt: -1 }).limit(50);
      return res.status(200).json({ success: true, count: messages.length, messages });
    } else {
      const msgs = (fallbackStore.messages || []).filter(m => String(m.patientId) === String(patientId));
      return res.status(200).json({ success: true, count: msgs.length, messages: msgs });
    }
  } catch (error) {
    next(error);
  }
};

const sendMessage = async (req, res, next) => {
  try {
    const patientId = req.body.patientId || await resolvePatientId(req);
    const { message, type = 'CHECK_IN', recipientPhone } = req.body;
    if (!message) return res.status(400).json({ success: false, message: 'Message text is required.' });

    const senderName = req.user.name || 'Caregiver';
    let patientName = 'Patient';
    let phone = recipientPhone || '+91 98765 43210';

    if (isDBConnected()) {
      const pat = await PatientModel.findById(patientId).populate('userId', 'name email');
      if (pat) patientName = pat.userId?.name || 'Patient';

      const newMsg = await MessageModel.create({
        patientId,
        senderId: req.user._id || req.user.id,
        senderRole: req.user.role || 'caregiver',
        senderName,
        recipientName: patientName,
        recipientPhone: phone,
        message,
        type,
        dispatchStatus: 'SENT'
      });

      const cleanPhone = (phone || '').replace(/[^\d+]/g, '');
      const waNumber = cleanPhone.replace('+', '');
      const encodedMsg = encodeURIComponent(message);

      return res.status(201).json({
        success: true,
        message: 'Message dispatched successfully!',
        record: newMsg,
        dispatch: {
          whatsappUrl: waNumber ? `https://wa.me/${waNumber}?text=${encodedMsg}` : null,
          smsUrl: cleanPhone ? `sms:${cleanPhone}?body=${encodedMsg}` : null
        }
      });
    } else {
      const msgObj = {
        _id: 'msg_' + Date.now(),
        patientId: String(patientId),
        senderName,
        recipientName: 'John Doe',
        recipientPhone: phone,
        message,
        type,
        createdAt: new Date().toISOString()
      };
      if (!fallbackStore.messages) fallbackStore.messages = [];
      fallbackStore.messages.unshift(msgObj);

      const cleanPhone = (phone || '').replace(/[^\d+]/g, '');
      const waNumber = cleanPhone.replace('+', '');
      const encodedMsg = encodeURIComponent(message);

      return res.status(201).json({
        success: true,
        message: 'Message dispatched successfully!',
        record: msgObj,
        dispatch: {
          whatsappUrl: `https://wa.me/${waNumber}?text=${encodedMsg}`,
          smsUrl: `sms:${cleanPhone}?body=${encodedMsg}`
        }
      });
    }
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getPatientProfile,
  updatePatientProfile,
  getDashboardStats,
  resolvePatientId,
  getAssignedPatients,
  getPatientTrackingData,
  getPatientReports,
  getMessages,
  sendMessage
};
