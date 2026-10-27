const mongoose = require('mongoose');

const medicineSchema = new mongoose.Schema(
  {
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      required: [true, 'Medicine must belong to a Patient']
    },
    medicineName: {
      type: String,
      required: [true, 'Please provide medicine name'],
      trim: true
    },
    dosage: {
      type: String,
      required: [true, 'Please specify dosage (e.g., 500mg, 1 tablet, 5ml)'],
      trim: true
    },
    frequency: {
      type: String,
      required: [true, 'Please specify frequency (e.g., Once daily, Twice daily, Every 8 hours)'],
      trim: true
    },
    startDate: {
      type: Date,
      required: [true, 'Please provide medicine start date'],
      default: Date.now
    },
    endDate: {
      type: Date,
      required: [true, 'Please provide medicine end date']
    },
    instructions: {
      type: String,
      trim: true,
      default: 'Take with water after meal'
    },
    status: {
      type: String,
      enum: ['Active', 'Completed', 'Paused'],
      default: 'Active'
    }
  },
  {
    timestamps: true
  }
);

medicineSchema.virtual('isActive').get(function () {
  const now = new Date();
  return this.status === 'Active' && this.startDate <= now && this.endDate >= now;
});

medicineSchema.set('toJSON', { virtuals: true });
medicineSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Medicine', medicineSchema);
