const EmergencyAlertModel = require('../models/EmergencyAlert');
const CaregiverModel = require('../models/Caregiver');

class Notification {
  constructor({
    recipient = 'User',
    type = 'GENERAL_ALERT',
    message = '',
    timestamp = new Date()
  } = {}) {
    this.recipient = recipient;
    this.type = type;
    this.message = message;
    this.timestamp = timestamp;
  }

  sendNotification(channel = 'browser') {
    console.log(`[NOTIFICATION -> ${channel.toUpperCase()}] [${this.type}] To: ${this.recipient} :: ${this.message}`);

    return {
      sent: true,
      channel,
      type: this.type,
      recipient: this.recipient,
      message: this.message,
      dispatchedAt: this.timestamp
    };
  }
}

class EmergencyAlert extends Notification {
  constructor({
    patientId = null,
    patientName = 'Patient',
    alertTime = new Date(),
    status = 'triggered',
    location = { latitude: null, longitude: null, address: 'Home / Current Location' },
    notes = 'Emergency SOS triggered!'
  } = {}) {
    super({
      recipient: 'All Emergency Contacts & Caregivers',
      type: 'EMERGENCY_SOS',
      message: `CRITICAL ALERT: SOS triggered for ${patientName} at ${location.address || 'location'}! Immediate assistance required.`,
      timestamp: alertTime
    });

    this.patientId = patientId;
    this.patientName = patientName;
    this.alertTime = alertTime;
    this.status = status;
    this.location = location;
    this.notes = notes;
    this.notifiedCaregivers = [];
  }

  async triggerSOS(options = {}) {
    this.sendNotification('push');
    this.sendNotification('sms');

    const caregivers = await CaregiverModel.find({ patientId: this.patientId });

    this.notifiedCaregivers = caregivers.map((cg) => ({
      caregiverId: cg._id,
      name: cg.name,
      phone: cg.phone,
      status: 'Delivered (Simulated Priority Call & SMS)'
    }));

    const alertDoc = new EmergencyAlertModel({
      patientId: this.patientId,
      alertTime: this.alertTime,
      status: this.status,
      location: this.location,
      notifiedCaregivers: this.notifiedCaregivers,
      notes: this.notes
    });

    const savedDoc = await alertDoc.save();
    return savedDoc;
  }
}

module.exports = {
  Notification,
  EmergencyAlert
};
