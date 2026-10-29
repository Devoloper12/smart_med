const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      required: true
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    senderRole: {
      type: String,
      enum: ['caregiver', 'patient', 'system'],
      default: 'caregiver'
    },
    senderName: {
      type: String,
      required: true
    },
    recipientName: {
      type: String,
      required: true
    },
    recipientPhone: {
      type: String,
      default: ''
    },
    message: {
      type: String,
      required: [true, 'Message text is required']
    },
    type: {
      type: String,
      enum: ['CHECK_IN', 'MEDICINE_REMINDER', 'EMERGENCY_FOLLOWUP', 'CUSTOM'],
      default: 'CHECK_IN'
    },
    dispatchStatus: {
      type: String,
      default: 'SENT'
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Message', messageSchema);
