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
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Add indexes for faster queries
studentSchema.index({ parentId: 1 }); // For parent's student lookup
studentSchema.index({ name: 1 }); // For sorting by name
studentSchema.index({ class: 1 }); // For filtering by class

module.exports = mongoose.model('Student', studentSchema);
