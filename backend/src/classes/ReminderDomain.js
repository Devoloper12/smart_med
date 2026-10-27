const ReminderModel = require('../models/Reminder');
const NotificationClass = require('./NotificationDomain').Notification;

class Reminder {
  constructor({
    id = null,
    medicineId = null,
    reminderTime = null,
    status = 'pending',
    takenAt = null
  } = {}) {
    this.id = id;
    this.medicineId = medicineId;
    this.reminderTime = reminderTime ? new Date(reminderTime) : new Date();
    this.status = status;
    this.takenAt = takenAt;
  }

  async createReminder(data = {}) {
    const medicineId = data.medicineId || this.medicineId;
    const reminderTime = data.reminderTime || this.reminderTime;
    const status = data.status || this.status || 'pending';

    if (!medicineId || !reminderTime) {
      throw new Error('Medicine ID and reminder time are required.');
    }

    const doc = new ReminderModel({
      medicineId,
      reminderTime,
      status
    });

    const savedDoc = await doc.save();
    this.id = savedDoc._id;
    this.status = savedDoc.status;
    this.reminderTime = savedDoc.reminderTime;
    return savedDoc;
  }

  sendReminder(channel = 'browser', extraInfo = {}) {
    const medicineName = extraInfo.medicineName || 'Scheduled Medicine';
    const dosage = extraInfo.dosage || 'Prescribed dose';
    const message = `Time to take your medication: ${medicineName} (${dosage}) at ${this.reminderTime.toLocaleTimeString()}`;

    const notification = new NotificationClass({
      recipient: extraInfo.patientName || 'Patient',
      type: 'MEDICINE_REMINDER',
      message,
      timestamp: new Date()
    });

    const dispatchResult = notification.sendNotification(channel);

    return {
      reminderId: this.id,
      medicineName,
      reminderTime: this.reminderTime,
      channel,
      notification: dispatchResult
    };
  }

  async markAsTaken(reminderId) {
    const id = reminderId || this.id;
    const updated = await ReminderModel.findByIdAndUpdate(
      id,
      { status: 'taken', takenAt: new Date() },
      { new: true }
    );
    return updated;
  }

  async markAsMissed(reminderId) {
    const id = reminderId || this.id;
    const updated = await ReminderModel.findByIdAndUpdate(
      id,
      { status: 'missed' },
      { new: true }
    );
    return updated;
  }
}

module.exports = Reminder;
