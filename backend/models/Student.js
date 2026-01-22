const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  schoolName: {
    type: String,
    required: true
  },
  class: {
    type: String,
    required: true
  },
  parentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  rollNumber: String,
  dateOfBirth: Date,
  joiningDate: {
    type: Date,
    default: Date.now
  },
  monthlyFee: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Add indexes for faster queries
studentSchema.index({ parentId: 1 });
studentSchema.index({ name: 1 });
studentSchema.index({ class: 1 });
studentSchema.index({ joiningDate: 1 });

module.exports = mongoose.model('Student', studentSchema);
