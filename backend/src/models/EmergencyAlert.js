const mongoose = require('mongoose');

const emergencyAlertSchema = new mongoose.Schema(
  {
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      required: [true, 'Alert must be associated with a Patient']
    },
    alertTime: {
      type: Date,
      default: Date.now,
      required: true
    },
    status: {
      type: String,
      enum: ['triggered', 'notified', 'resolved'],
      default: 'triggered'
    },
    location: {
      latitude: { type: Number, default: null },
      longitude: { type: Number, default: null },
      address: { type: String, default: 'Home / Current Location' }
    },
    notifiedCaregivers: [
      {
        caregiverId: { type: mongoose.Schema.Types.ObjectId, ref: 'Caregiver' },
        name: String,
        phone: String,
        status: { type: String, default: 'Sent' }
      }
    ],
    notes: {
      type: String,
      default: 'Emergency SOS triggered by patient'
    },
    resolvedAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('EmergencyAlert', emergencyAlertSchema);
