const bcrypt = require('bcryptjs');

class FallbackStore {
  constructor() {
    this.users = [];
    this.patients = [];
    this.caregivers = [];
    this.medicines = [];
    this.reminders = [];
    this.prescriptions = [];
    this.emergencyAlerts = [];

    this.initDemoData();
  }

  initDemoData() {
    const salt = bcrypt.genSaltSync(10);
    const hashedPassword = bcrypt.hashSync('password123', salt);

    const demoUser = {
      _id: '65e000000000000000000001',
      name: 'John Doe',
      email: 'patient@demo.com',
      password: hashedPassword,
      role: 'patient',
      createdAt: new Date().toISOString()
    };
    this.users.push(demoUser);

    const demoPatient = {
      _id: '65e000000000000000000010',
      userId: demoUser._id,
      age: 48,
      bloodGroup: 'O+',
      medicalConditions: ['Hypertension', 'Type 2 Diabetes'],
      createdAt: new Date().toISOString()
    };
    this.patients.push(demoPatient);

    const demoCaregiver1 = {
      _id: '65e000000000000000000021',
      patientId: demoPatient._id,
      name: 'Hridya',
      phone: '+91 98765 43210',
      relationship: 'Spouse',
      email: 'hridya@example.com',
      isPrimary: true
    };
    this.caregivers.push(demoCaregiver1);

    const now = new Date();
    const nextMonth = new Date(Date.now() + 30 * 86400000);

    const med1 = {
      _id: '65e000000000000000000031',
      patientId: demoPatient._id,
      medicineName: 'Metformin HCl',
      dosage: '500 mg',
      frequency: 'Twice daily',
      startDate: new Date(Date.now() - 5 * 86400000).toISOString(),
      endDate: nextMonth.toISOString(),
      instructions: 'Take with breakfast and dinner',
      status: 'Active'
    };
    this.medicines.push(med1);

    const todayMorning = new Date();
    todayMorning.setHours(9, 0, 0, 0);

    this.reminders.push({
      _id: '65e000000000000000000041',
      medicineId: med1._id,
      reminderTime: todayMorning.toISOString(),
      status: 'pending',
      notes: ''
    });
  }
}

const fallbackStore = new FallbackStore();
module.exports = fallbackStore;
