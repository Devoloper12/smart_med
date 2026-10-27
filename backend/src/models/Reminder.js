const mongoose = require('mongoose');

const reminderSchema = new mongoose.Schema(
  {
    medicineId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Medicine',
      required: [true, 'Reminder must be associated with a Medicine']
    },
    reminderTime: {
      type: Date,
      required: [true, 'Please provide reminder date and time']
    },
    status: {
      type: String,
      enum: ['pending', 'taken', 'missed', 'snoozed'],
      default: 'pending'
    },
    takenAt: {
      type: Date,
      default: null
    },
    notes: {
      type: String,
      default: ''
    }
  },
  {
    timestamps: true
  }
);

reminderSchema.index({ reminderTime: 1, status: 1 });

module.exports = mongoose.model('Reminder', reminderSchema);
