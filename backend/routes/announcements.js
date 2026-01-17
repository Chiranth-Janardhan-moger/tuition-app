const express = require('express');
const router = express.Router();
const Announcement = require('../models/Announcement');
const { protect, adminOnly } = require('../middleware/auth');

// Get all announcements (only today's)
router.get('/', protect, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const announcements = await Announcement.find({
      createdAt: {
        $gte: today,
        $lt: tomorrow
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
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const result = await Announcement.deleteMany({
      createdAt: { $lt: today }
    });
    
    res.json({ message: `Deleted ${result.deletedCount} old announcements` });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
