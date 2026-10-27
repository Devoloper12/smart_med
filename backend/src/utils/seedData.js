require('dotenv').config();
const mongoose = require('mongoose');
const UserModel = require('../models/User');
const PatientModel = require('../models/Patient');
const CaregiverModel = require('../models/Caregiver');
const MedicineModel = require('../models/Medicine');
const ReminderModel = require('../models/Reminder');

const seed = async () => {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/smart_medicine_db';
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
    console.log('Seeding demo records...');

    await UserModel.deleteMany({ email: 'patient@demo.com' });

    const u = await UserModel.create({
      name: 'John Doe',
      email: 'patient@demo.com',
      password: 'password123',
      role: 'patient'
    });

    const p = await PatientModel.create({
      userId: u._id,
      age: 48,
      bloodGroup: 'O+',
      medicalConditions: ['Hypertension', 'Type 2 Diabetes']
    });

    await CaregiverModel.create({
      patientId: p._id,
      name: 'Hridya',
      phone: '+91 98765 43210',
      relationship: 'Spouse',
      email: 'hridya@example.com',
      isPrimary: true
    });

    const med = await MedicineModel.create({
      patientId: p._id,
      medicineName: 'Metformin HCl 500mg',
      dosage: '1 tablet (500mg)',
      frequency: 'Twice daily',
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 86400000),
      instructions: 'Take with meal',
      status: 'Active'
    });

    const now = new Date();
    await ReminderModel.create({
      medicineId: med._id,
      reminderTime: new Date(now.setHours(9, 0, 0, 0)),
      status: 'pending'
    });

    console.log('Seed completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Seed error:', err.message);
    process.exit(1);
  }
};

if (require.main === module) seed();
module.exports = seed;
