const mongoose = require('mongoose');

const feeSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true
  },
  monthlyAmount: {
    type: Number,
    required: true
  },
  payments: [{
    amount: {
      type: Number,
      required: true
    },
    paidDate: {
      type: Date,
      required: true
    },
    remarks: String,
    addedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  nextDueDate: {
    type: Date,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Fee', feeSchema);
