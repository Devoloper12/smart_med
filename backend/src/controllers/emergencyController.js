const mongoose = require('mongoose');
const EmergencyAlertModel = require('../models/EmergencyAlert');
const CaregiverModel = require('../models/Caregiver');
const { EmergencyAlert: EmergencyAlertDomain } = require('../classes/NotificationDomain');
const fallbackStore = require('../utils/fallbackStore');
const { resolvePatientId } = require('./patientController');

const isDBConnected = () => mongoose.connection.readyState === 1;

const triggerSOS = async (req, res, next) => {
  try {
    const patientId = await resolvePatientId(req);
    const { latitude, longitude, address, notes } = req.body;

    const patientName = req.user.name || 'Patient';
    const locationData = {
      latitude: latitude || null,
      longitude: longitude || null,
      address: address || 'Current Registered Location'
    };

    // Find all registered caregivers for this patient
    let caregivers = [];
    if (isDBConnected()) {
      caregivers = await CaregiverModel.find({ patientId });
    } else {
      caregivers = fallbackStore.caregivers.filter(c => String(c.patientId) === String(patientId));
    }

    const alertMessage = `🚨 EMERGENCY SOS ALERT! Patient ${patientName} requires immediate medical assistance!\n📍 Location: ${locationData.address}\n📝 Notes: ${notes || 'Immediate help needed'}\n⏰ Time: ${new Date().toLocaleTimeString()}`;

    // Generate direct WhatsApp and SMS dispatch URLs for each caregiver
    const dispatchedCaregivers = caregivers.map(cg => {
      const cleanPhone = (cg.phone || '').replace(/[^\d+]/g, '');
      const waNumber = cleanPhone.replace('+', '');
      const encodedMsg = encodeURIComponent(alertMessage);

      return {
        caregiverId: cg._id,
        name: cg.name,
        phone: cg.phone,
        relationship: cg.relationship,
        isPrimary: cg.isPrimary,
        whatsappUrl: `https://wa.me/${waNumber}?text=${encodedMsg}`,
        smsUrl: `sms:${cleanPhone}?body=${encodedMsg}`,
        callUrl: `tel:${cleanPhone}`,
        status: 'Dispatched (SMS / WhatsApp Ready)'
      };
    });

    if (isDBConnected()) {
      const emergencyDomain = new EmergencyAlertDomain({
        patientId,
        patientName,
        alertTime: new Date(),
        status: 'triggered',
        location: locationData,
        notes: notes || 'Immediate medical assistance required!'
      });

      const savedAlert = await emergencyDomain.triggerSOS();
      savedAlert.notifiedCaregivers = dispatchedCaregivers;
      await savedAlert.save();

      return res.status(201).json({
        success: true,
        message: `🚨 EMERGENCY SOS TRIGGERED! Alert dispatched to ${caregivers.length} caregiver(s).`,
        alert: savedAlert,
        alertMessage,
        caregivers: dispatchedCaregivers
      });
    } else {
      const newAlert = {
        _id: 'sos_' + Date.now(),
        patientId: String(patientId),
        alertTime: new Date().toISOString(),
        status: 'triggered',
        location: locationData,
        notifiedCaregivers: dispatchedCaregivers,
        notes: notes || 'Immediate medical assistance required!'
      };
      fallbackStore.emergencyAlerts.unshift(newAlert);

      return res.status(201).json({
        success: true,
        message: `🚨 EMERGENCY SOS TRIGGERED! Alert dispatched to ${caregivers.length} caregiver(s).`,
        alert: newAlert,
        alertMessage,
        caregivers: dispatchedCaregivers
      });
    }
  } catch (error) {
    next(error);
  }
};

const getEmergencyAlerts = async (req, res, next) => {
  try {
    const patientId = await resolvePatientId(req);
    if (isDBConnected()) {
      const alerts = await EmergencyAlertModel.find({ patientId }).sort({ alertTime: -1 });
      return res.status(200).json({ success: true, count: alerts.length, alerts });
    } else {
      const alerts = fallbackStore.emergencyAlerts.filter(a => String(a.patientId) === String(patientId));
      return res.status(200).json({ success: true, count: alerts.length, alerts });
    }
  } catch (error) {
    next(error);
  }
};

const resolveAlert = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (isDBConnected()) {
      const updated = await EmergencyAlertModel.findByIdAndUpdate(id, { status: 'resolved', resolvedAt: new Date() }, { new: true });
      return res.status(200).json({ success: true, message: 'Emergency alert resolved.', alert: updated });
    } else {
      const alert = fallbackStore.emergencyAlerts.find(a => String(a._id) === String(id));
      if (alert) alert.status = 'resolved';
      return res.status(200).json({ success: true, message: 'Emergency alert resolved.', alert });
    }
  } catch (error) {
    next(error);
  }
};

module.exports = { triggerSOS, getEmergencyAlerts, resolveAlert };
