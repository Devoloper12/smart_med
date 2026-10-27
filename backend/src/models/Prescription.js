const mongoose = require('mongoose');

const prescriptionSchema = new mongoose.Schema(
  {
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      required: [true, 'Prescription must belong to a Patient']
    },
    fileUrl: {
      type: String,
      required: [true, 'Prescription file path/URL is required']
    },
    originalName: {
      type: String,
      default: 'Prescription'
    },
    mimeType: {
      type: String,
      default: 'application/pdf'
    },
    fileSize: {
      type: Number,
      default: 0
    },
    doctorName: {
      type: String,
      required: [true, 'Please provide doctor name'],
      trim: true
    },
    prescriptionDate: {
      type: Date,
      required: [true, 'Please provide prescription date'],
      default: Date.now
    },
    notes: {
      type: String,
      trim: true,
      default: ''
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Prescription', prescriptionSchema);
