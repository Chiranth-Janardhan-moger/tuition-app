const express = require('express');
const router = express.Router();
const MaintenanceMode = require('../models/MaintenanceMode');
const { protect, developerOnly } = require('../middleware/auth');

// Get maintenance status for a feature (public)
router.get('/status/:featureName', async (req, res) => {
  try {
    const { featureName } = req.params;
    const maintenance = await MaintenanceMode.findOne({ featureName });
    
    if (!maintenance) {
      return res.json({ isActive: false, message: '' });
    }
    
    res.json({
      isActive: maintenance.isActive,
      message: maintenance.message
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get all maintenance modes (Developer only)
router.get('/all', protect, developerOnly, async (req, res) => {
  try {
    const maintenanceModes = await MaintenanceMode.find().sort({ featureName: 1 });
    res.json(maintenanceModes);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Toggle maintenance mode (Developer only)
router.post('/toggle', protect, developerOnly, async (req, res) => {
  try {
    const { featureName, isActive, message } = req.body;
    
    const maintenance = await MaintenanceMode.findOneAndUpdate(
      { featureName },
      {
        isActive,
        message: message || 'This feature is currently under maintenance. Please try again later.',
        updatedBy: req.user._id,
        updatedAt: new Date()
      },
      { upsert: true, new: true }
    );
    
    res.json(maintenance);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
