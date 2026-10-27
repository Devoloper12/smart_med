const mongoose = require('mongoose');

const patientSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Patient must be linked to a User account'],
      unique: true
    },
    age: {
      type: Number,
      required: [true, 'Please provide age'],
      min: [1, 'Age must be at least 1'],
      max: [130, 'Age cannot exceed 130']
    },
    bloodGroup: {
      type: String,
      required: [true, 'Please provide blood group'],
      enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Unknown'],
      default: 'Unknown'
    },
    medicalConditions: {
      type: [String],
      default: []
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Patient', patientSchema);
