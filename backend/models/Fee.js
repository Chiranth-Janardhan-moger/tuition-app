const mongoose = require('mongoose');

const feeSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true
  },
  feeName: {
    type: String,
    required: true // e.g., "August Fee"
  },
  feeAmount: {
    type: Number,
    required: true
  },
  periodStart: {
    type: Date,
    required: true // e.g., 8 Aug
  },
  periodEnd: {
    type: Date,
    required: true // e.g., 7 Sep
  },
  status: {
    type: String,
    enum: ['pending', 'paid', 'overdue', 'waived'],
    default: 'pending'
  },
  paidDate: {
    type: Date
  },
  paidBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  remarks: String,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Indexes for faster queries
feeSchema.index({ studentId: 1, periodStart: 1 });
feeSchema.index({ status: 1 });
feeSchema.index({ periodEnd: 1 });

module.exports = mongoose.model('Fee', feeSchema);
