const mongoose = require('mongoose');

const maintenanceModeSchema = new mongoose.Schema({
  featureName: {
    type: String,
    required: true,
    unique: true,
    enum: ['fees', 'attendance', 'timings', 'announcements', 'chat']
  },
  isActive: {
    type: Boolean,
    default: false
  },
  message: {
    type: String,
    default: 'This feature is currently under maintenance. Please try again later.'
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('MaintenanceMode', maintenanceModeSchema);
