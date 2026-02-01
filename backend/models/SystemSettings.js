const mongoose = require('mongoose');

const systemSettingsSchema = new mongoose.Schema({
  // Feature toggles
  features: {
    licenseManagement: {
      type: Boolean,
      default: false,
      description: 'Show license management in admin profile'
    },
    feeRegenerationTool: {
      type: Boolean,
      default: true,
      description: 'Show fee cycle regeneration tool in admin profile'
    },
    maintenanceMode: {
      type: Boolean,
      default: false,
      description: 'Enable maintenance mode (blocks all non-developer access)'
    }
  },
  
  // Maintenance settings
  maintenanceMessage: {
    type: String,
    default: 'System is under maintenance. Please try again later.'
  },
  
  // Last updated
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Static method to get current settings
systemSettingsSchema.statics.getSettings = async function() {
  let settings = await this.findOne();
  
  // Create default settings if none exist
  if (!settings) {
    settings = await this.create({
      features: {
        licenseManagement: false,
        feeRegenerationTool: true,
        maintenanceMode: false
      }
    });
  }
  
  return settings;
};

// Static method to update feature toggle
systemSettingsSchema.statics.updateFeature = async function(featureName, value, userId) {
  let settings = await this.getSettings();
  
  if (settings.features[featureName] !== undefined) {
    settings.features[featureName] = value;
    settings.updatedBy = userId;
    await settings.save();
  }
  
  return settings;
};

module.exports = mongoose.model('SystemSettings', systemSettingsSchema);
