const User = require('./UserDomain');
const CaregiverModel = require('../models/Caregiver');

class Caregiver extends User {
  constructor({
    id = null,
    name = '',
    email = '',
    role = 'caregiver',
    caregiverId = null,
    phone = '',
    relationship = 'Family Member',
    patientId = null
  } = {}) {
    super({ id, name, email, role: 'caregiver' });
    this.caregiverId = caregiverId;
    this.phone = phone;
    this.relationship = relationship;
    this.patientId = patientId;
  }

  receiveAlert(alertPayload) {
    const timestamp = new Date().toISOString();
    const alertMessage = `[ALERT RECEIVED by Caregiver: ${this.name} (${this.relationship})] -> Type: ${alertPayload.type || 'EMERGENCY'}, Message: ${alertPayload.message}, Patient: ${alertPayload.patientName || 'Assigned Patient'}, Time: ${timestamp}`;

    console.log(`\x1b[31m${alertMessage}\x1b[0m`);

    return {
      received: true,
      caregiverId: this.caregiverId || this.id,
      caregiverName: this.name,
      caregiverPhone: this.phone,
      receivedAt: timestamp,
      status: 'Delivered',
      alertPayload
    };
  }

  static async findCaregiversForPatient(patientId) {
    return await CaregiverModel.find({ patientId });
  }
}

module.exports = Caregiver;
