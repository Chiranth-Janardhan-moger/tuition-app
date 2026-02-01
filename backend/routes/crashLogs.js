const express = require('express');
const router = express.Router();
const CrashLog = require('../models/CrashLog');
const DeviceAnalytics = require('../models/DeviceAnalytics');
const { protect, developerOnly } = require('../middleware/auth');

// Report a crash (from mobile app)
router.post('/report', async (req, res) => {
  try {
    const crashData = req.body;
    
    // Create crash log
    const crashLog = new CrashLog(crashData);
    await crashLog.save();
    
    // Update device analytics
    if (crashData.deviceInfo && crashData.deviceInfo.uniqueId) {
      await DeviceAnalytics.findOneAndUpdate(
        { 'deviceInfo.uniqueId': crashData.deviceInfo.uniqueId },
        { 
          $inc: { 'usage.totalCrashes': 1 },
          $set: { 'usage.lastSeen': new Date() }
        },
        { upsert: false }
      );
    }
    
    res.status(201).json({ message: 'Crash reported successfully' });
  } catch (error) {
    console.error('Error reporting crash:', error);
    res.status(500).json({ message: 'Failed to report crash' });
  }
});

// Report device analytics (from mobile app)
router.post('/analytics', async (req, res) => {
  try {
    const analyticsData = req.body;
    
    // Check if device exists
    const existingDevice = await DeviceAnalytics.findOne({
      'deviceInfo.uniqueId': analyticsData.deviceInfo.uniqueId
    });
    
    if (existingDevice) {
      // Update existing device
      await DeviceAnalytics.findOneAndUpdate(
        { 'deviceInfo.uniqueId': analyticsData.deviceInfo.uniqueId },
        {
          $set: {
            deviceInfo: analyticsData.deviceInfo,
            appInfo: analyticsData.appInfo,
            location: analyticsData.location,
            'usage.lastSeen': new Date()
          },
          $inc: { 'usage.totalSessions': 1 }
        },
        { new: true }
      );
    } else {
      // Create new device record
      const newDevice = new DeviceAnalytics({
        deviceInfo: analyticsData.deviceInfo,
        appInfo: analyticsData.appInfo,
        location: analyticsData.location,
        usage: {
          firstLaunch: analyticsData.usage?.firstLaunch || new Date(),
          lastSeen: new Date(),
          totalSessions: 1,
          totalCrashes: 0
        },
        isActive: true
      });
      await newDevice.save();
    }
    
    res.status(200).json({ message: 'Analytics updated successfully' });
  } catch (error) {
    console.error('Error updating analytics:', error);
    res.status(500).json({ message: 'Failed to update analytics' });
  }
});

// Get crash logs (Developer only)
router.get('/crashes', protect, developerOnly, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    
    const filter = {};
    if (req.query.resolved !== undefined) {
      filter.resolved = req.query.resolved === 'true';
    }
    if (req.query.crashType) {
      filter['crashInfo.crashType'] = req.query.crashType;
    }
    if (req.query.deviceModel) {
      filter['deviceInfo.model'] = { $regex: req.query.deviceModel, $options: 'i' };
    }
    
    const crashes = await CrashLog.find(filter)
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit)
      .populate('userInfo.userId', 'name phoneNumber')
      .populate('resolvedBy', 'name');
    
    const total = await CrashLog.countDocuments(filter);
    
    // Get crash statistics
    const stats = await CrashLog.aggregate([
      {
        $group: {
          _id: null,
          totalCrashes: { $sum: 1 },
          resolvedCrashes: { $sum: { $cond: ['$resolved', 1, 0] } },
          startupCrashes: { $sum: { $cond: [{ $eq: ['$crashInfo.crashType', 'startup'] }, 1, 0] } },
          runtimeCrashes: { $sum: { $cond: [{ $eq: ['$crashInfo.crashType', 'runtime'] }, 1, 0] } }
        }
      }
    ]);
    
    res.json({
      crashes,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      },
      stats: stats[0] || { totalCrashes: 0, resolvedCrashes: 0, startupCrashes: 0, runtimeCrashes: 0 }
    });
  } catch (error) {
    console.error('Error fetching crashes:', error);
    res.status(500).json({ message: 'Failed to fetch crashes' });
  }
});

// Get device analytics (Developer only)
router.get('/devices', protect, developerOnly, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    
    const filter = { isActive: true };
    if (req.query.model) {
      filter['deviceInfo.model'] = { $regex: req.query.model, $options: 'i' };
    }
    if (req.query.version) {
      filter['appInfo.version'] = req.query.version;
    }
    
    const devices = await DeviceAnalytics.find(filter)
      .sort({ 'usage.lastSeen': -1 })
      .skip(skip)
      .limit(limit);
    
    const total = await DeviceAnalytics.countDocuments(filter);
    
    // Get device statistics
    const stats = await DeviceAnalytics.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: null,
          totalDevices: { $sum: 1 },
          totalSessions: { $sum: '$usage.totalSessions' },
          totalCrashes: { $sum: '$usage.totalCrashes' },
          avgSessionsPerDevice: { $avg: '$usage.totalSessions' }
        }
      }
    ]);
    
    // Get top device models
    const topModels = await DeviceAnalytics.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: '$deviceInfo.model',
          count: { $sum: 1 },
          brand: { $first: '$deviceInfo.brand' }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);
    
    // Get app version distribution
    const versionDistribution = await DeviceAnalytics.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: '$appInfo.version',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);
    
    res.json({
      devices,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      },
      stats: stats[0] || { totalDevices: 0, totalSessions: 0, totalCrashes: 0, avgSessionsPerDevice: 0 },
      topModels,
      versionDistribution
    });
  } catch (error) {
    console.error('Error fetching device analytics:', error);
    res.status(500).json({ message: 'Failed to fetch device analytics' });
  }
});

// Mark crash as resolved (Developer only)
router.patch('/crashes/:id/resolve', protect, developerOnly, async (req, res) => {
  try {
    const { notes } = req.body;
    
    const crash = await CrashLog.findByIdAndUpdate(
      req.params.id,
      {
        resolved: true,
        resolvedBy: req.user._id,
        resolvedAt: new Date(),
        notes
      },
      { new: true }
    );
    
    if (!crash) {
      return res.status(404).json({ message: 'Crash not found' });
    }
    
    res.json({ message: 'Crash marked as resolved', crash });
  } catch (error) {
    console.error('Error resolving crash:', error);
    res.status(500).json({ message: 'Failed to resolve crash' });
  }
});

// Get crash details (Developer only)
router.get('/crashes/:id', protect, developerOnly, async (req, res) => {
  try {
    const crash = await CrashLog.findById(req.params.id)
      .populate('userInfo.userId', 'name phoneNumber')
      .populate('resolvedBy', 'name');
    
    if (!crash) {
      return res.status(404).json({ message: 'Crash not found' });
    }
    
    res.json(crash);
  } catch (error) {
    console.error('Error fetching crash details:', error);
    res.status(500).json({ message: 'Failed to fetch crash details' });
  }
});

// Delete crash log (Developer only - only resolved crashes)
router.delete('/crashes/:id', protect, developerOnly, async (req, res) => {
  try {
    const crash = await CrashLog.findById(req.params.id);
    
    if (!crash) {
      return res.status(404).json({ message: 'Crash not found' });
    }
    
    // Only allow deletion of resolved crashes
    if (!crash.resolved) {
      return res.status(400).json({ message: 'Can only delete resolved crashes' });
    }
    
    await CrashLog.findByIdAndDelete(req.params.id);
    
    res.json({ message: 'Crash log deleted successfully' });
  } catch (error) {
    console.error('Error deleting crash:', error);
    res.status(500).json({ message: 'Failed to delete crash' });
  }
});

module.exports = router;