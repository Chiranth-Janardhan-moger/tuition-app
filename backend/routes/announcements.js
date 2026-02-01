const express = require('express');
const router = express.Router();
const Announcement = require('../models/Announcement');
const { protect, adminOnly } = require('../middleware/auth');

// Get all announcements (recent ones)
router.get('/', protect, async (req, res) => {
  try {
    // Show announcements from the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const announcements = await Announcement.find({
      createdAt: {
        $gte: thirtyDaysAgo
      }
    })
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 })
      .limit(50);
    res.json(announcements);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create announcement (Admin)
router.post('/', protect, adminOnly, async (req, res) => {
  try {
    const announcement = await Announcement.create({
      ...req.body,
      createdBy: req.user._id
    });
    res.status(201).json(announcement);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete announcement (Admin)
router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    await Announcement.findByIdAndDelete(req.params.id);
    res.json({ message: 'Announcement deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Auto-delete old announcements (called periodically or on request)
router.delete('/cleanup/old', protect, adminOnly, async (req, res) => {
  try {
    // Delete announcements older than 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const result = await Announcement.deleteMany({
      createdAt: { $lt: thirtyDaysAgo }
    });
    
    res.json({ message: `Deleted ${result.deletedCount} old announcements` });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
