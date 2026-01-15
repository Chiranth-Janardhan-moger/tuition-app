const express = require('express');
const router = express.Router();
const Timing = require('../models/Timing');
const { protect, adminOnly } = require('../middleware/auth');

// Get today's timing
router.get('/today', protect, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const timing = await Timing.findOne({
      date: { $gte: today, $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000) }
    });
    
    res.json(timing);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get all timings
router.get('/', protect, async (req, res) => {
  try {
    const timings = await Timing.find().sort({ date: -1 }).limit(30);
    res.json(timings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create/Update timing (Admin)
router.post('/', protect, adminOnly, async (req, res) => {
  try {
    const { date, startTime, endTime, subject, remarks } = req.body;
    
    const timing = await Timing.findOneAndUpdate(
      { date: new Date(date) },
      { startTime, endTime, subject, remarks },
      { new: true, upsert: true }
    );
    
    res.json(timing);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
