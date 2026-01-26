const mongoose = require('mongoose');

const deviceAnalyticsSchema = new mongoose.Schema({
  deviceInfo: {
    model: { type: String, required: true },
    brand: { type: String, required: true },
    osVersion: { type: String, required: true },
    architecture: { type: String, required: true },
    screenResolution: String,
    totalMemory: String,
    uniqueId: { type: String, required: true, unique: true } // Device fingerprint
  },
  appInfo: {
    version: { type: String, required: true },
    buildNumber: Number,
    installationId: String,
    firstInstallTime: Date,
    lastUpdateTime: Date
  },
  usage: {
    firstLaunch: { type: Date, default: Date.now },
    lastSeen: { type: Date, default: Date.now },
    totalSessions: { type: Number, default: 1 },
    totalCrashes: { type: Number, default: 0 },
    averageSessionDuration: Number
  },
  location: {
    country: String,
    region: String,
    city: String,
    timezone: String
  },
  isActive: { type: Boolean, default: true }
}, {
  timestamps: true
});

// Index for better query performance
deviceAnalyticsSchema.index({ 'deviceInfo.uniqueId': 1 });
deviceAnalyticsSchema.index({ 'deviceInfo.model': 1 });
deviceAnalyticsSchema.index({ 'appInfo.version': 1 });
deviceAnalyticsSchema.index({ 'usage.lastSeen': -1 });

module.exports = mongoose.model('DeviceAnalytics', deviceAnalyticsSchema);