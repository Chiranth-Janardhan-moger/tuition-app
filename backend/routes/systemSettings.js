const express = require('express');
const router = express.Router();
const SystemSettings = require('../models/SystemSettings');
const { protect, adminOnly, developerOnly } = require('../middleware/auth');

// Get system settings (Admin & Developer)
router.get('/', protect, async (req, res) => {
  try {
    const settings = await SystemSettings.getSettings();
    
    // Return only features for non-developers
    if (req.user.role !== 'developer') {
      return res.json({
        features: settings.features
      });
    }
    
    // Return full settings for developers
    res.json(settings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update feature toggle (Developer only)
router.put('/features/:featureName', protect, developerOnly, async (req, res) => {
  try {
    const { featureName } = req.params;
    const { enabled } = req.body;
    
    if (typeof enabled !== 'boolean') {
      return res.status(400).json({ message: 'enabled must be a boolean' });
    }
    
    const settings = await SystemSettings.updateFeature(featureName, enabled, req.user._id);
    
    res.json({
      message: `Feature ${featureName} ${enabled ? 'enabled' : 'disabled'}`,
      features: settings.features
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update maintenance message (Developer only)
router.put('/maintenance-message', protect, developerOnly, async (req, res) => {
  try {
    const { message } = req.body;
    
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ message: 'Valid message required' });
    }
    
    const settings = await SystemSettings.getSettings();
    settings.maintenanceMessage = message;
    settings.updatedBy = req.user._id;
    await settings.save();
    
    res.json({
      message: 'Maintenance message updated',
      maintenanceMessage: settings.maintenanceMessage
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Bulk update features (Developer only)
router.put('/features', protect, developerOnly, async (req, res) => {
  try {
    const { features } = req.body;
    
    if (!features || typeof features !== 'object') {
      return res.status(400).json({ message: 'Valid features object required' });
    }
    
    const settings = await SystemSettings.getSettings();
    
    // Update only provided features
    Object.keys(features).forEach(key => {
      if (settings.features[key] !== undefined && typeof features[key] === 'boolean') {
        settings.features[key] = features[key];
      }
    });
    
    settings.updatedBy = req.user._id;
    await settings.save();
    
    res.json({
      message: 'Features updated',
      features: settings.features
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
