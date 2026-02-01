const mongoose = require('mongoose');

const licenseSchema = new mongoose.Schema({
  licenseKey: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  organizationName: {
    type: String,
    required: true
  },
  adminEmail: {
    type: String
  },
  adminPhone: {
    type: String
  },
  planType: {
    type: String,
    enum: ['trial', 'monthly', 'quarterly', 'yearly', 'lifetime'],
    required: true
  },
  planDuration: {
    type: Number, // in days
    required: true
  },
  activatedAt: {
    type: Date
  },
  expiresAt: {
    type: Date
  },
  isActive: {
    type: Boolean,
    default: false
  },
  isExpired: {
    type: Boolean,
    default: false
  },
  maxStudents: {
    type: Number,
    default: 1000
  },
  features: {
    type: [String],
    default: ['basic']
  },
  generatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  activatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  notes: {
    type: String
  }
}, {
  timestamps: true
});

// Method to check if license is valid
licenseSchema.methods.isValid = function() {
  if (!this.isActive) return false;
  if (this.isExpired) return false;
  if (this.expiresAt && new Date() > this.expiresAt) {
    this.isExpired = true;
    this.save();
    return false;
  }
  return true;
};

// Method to get days remaining
licenseSchema.methods.daysRemaining = function() {
  if (!this.expiresAt) return null;
  const now = new Date();
  const diff = this.expiresAt - now;
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
};

// Static method to get active license
licenseSchema.statics.getActiveLicense = async function() {
  const license = await this.findOne({ 
    isActive: true, 
    isExpired: false 
  }).sort({ expiresAt: -1 });
  
  if (license && !license.isValid()) {
    return null;
  }
  
  return license;
};

module.exports = mongoose.model('License', licenseSchema);
