const mongoose = require('mongoose');

const crashLogSchema = new mongoose.Schema({
  deviceInfo: {
    model: { type: String, required: true },
    brand: { type: String, required: true },
    osVersion: { type: String, required: true },
    appVersion: { type: String, required: true },
    architecture: { type: String, required: true },
    screenResolution: String,
    totalMemory: String,
    availableMemory: String
  },
  crashInfo: {
    errorMessage: { type: String, required: true },
    stackTrace: { type: String, required: true },
    componentStack: String,
    errorBoundary: String,
    crashType: { 
      type: String, 
      enum: ['startup', 'runtime', 'navigation', 'api', 'ui'], 
      default: 'runtime' 
    }
  },
  userInfo: {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    userRole: { type: String, enum: ['admin', 'parent', 'developer'] },
    isFirstLaunch: { type: Boolean, default: false }
  },
  appState: {
    currentScreen: String,
    previousScreen: String,
    networkStatus: String,
    batteryLevel: Number,
    isCharging: Boolean
  },
  timestamp: { type: Date, default: Date.now },
  resolved: { type: Boolean, default: false },
  resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  resolvedAt: Date,
  notes: String
}, {
  timestamps: true
});

// Index for better query performance
crashLogSchema.index({ timestamp: -1 });
crashLogSchema.index({ 'deviceInfo.model': 1 });
crashLogSchema.index({ 'crashInfo.crashType': 1 });
crashLogSchema.index({ resolved: 1 });

module.exports = mongoose.model('CrashLog', crashLogSchema);