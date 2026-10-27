const mongoose = require('mongoose');

const caregiverSchema = new mongoose.Schema(
  {
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      required: [true, 'Caregiver must be linked to a Patient']
    },
    name: {
      type: String,
      required: [true, 'Please provide caregiver name'],
      trim: true
    },
    phone: {
      type: String,
      required: [true, 'Please provide caregiver phone number'],
      trim: true
    },
    relationship: {
      type: String,
      required: [true, 'Please provide relationship with patient'],
      trim: true,
      default: 'Family Member'
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: ''
    },
    isPrimary: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Caregiver', caregiverSchema);
