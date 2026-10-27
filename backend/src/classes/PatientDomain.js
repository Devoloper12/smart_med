const User = require('./UserDomain');
const MedicineModel = require('../models/Medicine');
const PatientModel = require('../models/Patient');

class Patient extends User {
  constructor({
    id = null,
    name = '',
    email = '',
    role = 'patient',
    patientId = null,
    age = null,
    bloodGroup = 'Unknown',
    medicalConditions = []
  } = {}) {
    super({ id, name, email, role: 'patient' });
    this.patientId = patientId;
    this.age = age;
    this.bloodGroup = bloodGroup;
    this.medicalConditions = Array.isArray(medicalConditions) ? medicalConditions : [];
  }

  async addMedicine(medicineData) {
    if (!this.patientId) {
      throw new Error('Patient profile is not initialized.');
    }

    const { medicineName, dosage, frequency, startDate, endDate, instructions } = medicineData;

    if (!medicineName || !dosage || !frequency || !endDate) {
      throw new Error('Medicine name, dosage, frequency, and end date are required.');
    }

    const newMed = new MedicineModel({
      patientId: this.patientId,
      medicineName,
      dosage,
      frequency,
      startDate: startDate || new Date(),
      endDate,
      instructions: instructions || 'Take with water after meal'
    });

    const savedMedicine = await newMed.save();
    return savedMedicine;
  }

  async viewMedicines(filter = {}) {
    if (!this.patientId) {
      throw new Error('Patient profile is not initialized.');
    }

    const query = { patientId: this.patientId, ...filter };
    const medicines = await MedicineModel.find(query).sort({ createdAt: -1 });
    return medicines;
  }

  static async findByUserId(userId) {
    return await PatientModel.findOne({ userId }).populate('userId', 'name email role');
  }
}

module.exports = Patient;
