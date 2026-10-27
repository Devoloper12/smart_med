const MedicineModel = require('../models/Medicine');
const ReminderModel = require('../models/Reminder');

class Medicine {
  constructor({
    id = null,
    patientId = null,
    medicineName = '',
    dosage = '',
    frequency = '',
    startDate = null,
    endDate = null,
    instructions = '',
    status = 'Active'
  } = {}) {
    this.id = id;
    this.patientId = patientId;
    this.medicineName = medicineName;
    this.dosage = dosage;
    this.frequency = frequency;
    this.startDate = startDate || new Date();
    this.endDate = endDate;
    this.instructions = instructions;
    this.status = status;
  }

  async createMedicine(data = {}) {
    const payload = {
      patientId: data.patientId || this.patientId,
      medicineName: data.medicineName || this.medicineName,
      dosage: data.dosage || this.dosage,
      frequency: data.frequency || this.frequency,
      startDate: data.startDate || this.startDate || new Date(),
      endDate: data.endDate || this.endDate,
      instructions: data.instructions || this.instructions || 'Take with water after meal',
      status: data.status || this.status || 'Active'
    };

    if (!payload.patientId || !payload.medicineName || !payload.dosage || !payload.frequency || !payload.endDate) {
      throw new Error('Missing required fields for medicine creation.');
    }

    const doc = new MedicineModel(payload);
    const savedDoc = await doc.save();
    this.id = savedDoc._id;
    this.medicineName = savedDoc.medicineName;
    this.dosage = savedDoc.dosage;
    this.frequency = savedDoc.frequency;
    this.startDate = savedDoc.startDate;
    this.endDate = savedDoc.endDate;
    this.instructions = savedDoc.instructions;
    this.status = savedDoc.status;

    await this.generateReminders(savedDoc._id, savedDoc.frequency, savedDoc.startDate, savedDoc.endDate);

    return savedDoc;
  }

  async updateMedicine(medicineId, updateData) {
    const idToUpdate = medicineId || this.id;
    if (!idToUpdate) {
      throw new Error('Medicine ID is required for update.');
    }

    const updatedDoc = await MedicineModel.findByIdAndUpdate(
      idToUpdate,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!updatedDoc) {
      throw new Error('Medicine not found.');
    }

    return updatedDoc;
  }

  async generateReminders(medicineId, frequency, startDate, endDate) {
    const start = new Date(startDate || Date.now());
    const end = new Date(endDate);
    const now = new Date();

    let timeOffsets = ['08:00', '13:00', '20:00'];
    const lowerFreq = frequency.toLowerCase();

    if (lowerFreq.includes('once') || lowerFreq.includes('1 time')) {
      timeOffsets = ['09:00'];
    } else if (lowerFreq.includes('twice') || lowerFreq.includes('2 times')) {
      timeOffsets = ['09:00', '21:00'];
    } else if (lowerFreq.includes('thrice') || lowerFreq.includes('3 times') || lowerFreq.includes('8 hour')) {
      timeOffsets = ['08:00', '14:00', '20:00'];
    } else if (lowerFreq.includes('4 times') || lowerFreq.includes('6 hour')) {
      timeOffsets = ['06:00', '12:00', '18:00', '22:00'];
    }

    const remindersToInsert = [];
    const daysToSchedule = 7;
    for (let day = 0; day < daysToSchedule; day++) {
      const targetDay = new Date();
      targetDay.setDate(now.getDate() + day);

      if (targetDay > end) break;

      for (const timeStr of timeOffsets) {
        const [hours, minutes] = timeStr.split(':').map(Number);
        const reminderTime = new Date(targetDay);
        reminderTime.setHours(hours, minutes, 0, 0);

        if (reminderTime >= start && reminderTime <= end) {
          remindersToInsert.push({
            medicineId,
            reminderTime,
            status: reminderTime < now ? 'missed' : 'pending'
          });
        }
      }
    }

    if (remindersToInsert.length > 0) {
      await ReminderModel.insertMany(remindersToInsert);
    }
  }
}

module.exports = Medicine;
