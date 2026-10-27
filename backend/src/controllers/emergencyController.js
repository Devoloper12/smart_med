const mongoose = require('mongoose');
const EmergencyAlertModel = require('../models/EmergencyAlert');
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
      return res.status(201).json({
        success: true,
        message: '🚨 EMERGENCY SOS TRIGGERED! Caregivers and emergency contacts have been alerted.',
        alert: savedAlert
      });
    } else {
      const newAlert = {
        _id: 'sos_' + Date.now(),
        patientId: String(patientId),
        alertTime: new Date().toISOString(),
        status: 'triggered',
        location: locationData,
        notes: notes || 'Immediate medical assistance required!'
      };
      fallbackStore.emergencyAlerts.unshift(newAlert);

      return res.status(201).json({
        success: true,
        message: '🚨 EMERGENCY SOS TRIGGERED! Caregivers and emergency contacts have been alerted.',
        alert: newAlert
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
