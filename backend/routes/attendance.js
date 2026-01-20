const express = require('express');
const router = express.Router();
const Attendance = require('../models/Attendance');
const { protect, adminOnly } = require('../middleware/auth');

// Get attendance by student - Optimized with lean()
router.get('/student/:studentId', protect, async (req, res) => {
  try {
    const { month, year } = req.query;
    let query = { studentId: req.params.studentId };
    
    if (month && year) {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0);
      query.date = { $gte: startDate, $lte: endDate };
    }

    const attendance = await Attendance.find(query)
      .sort({ date: -1 })
      .lean() // Use lean() for faster queries
      .select('date status'); // Only select needed fields
    
    res.json(attendance);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Mark attendance (Admin) - Optimized with upsert
router.post('/', protect, adminOnly, async (req, res) => {
  try {
    const { studentId, date, status } = req.body;
    
    // Use findOneAndUpdate with upsert for atomic operation
    const attendance = await Attendance.findOneAndUpdate(
      { studentId, date },
      { 
        status, 
        markedBy: req.user._id,
        studentId,
        date
      },
      { 
        new: true, 
        upsert: true,
        setDefaultsOnInsert: true
      }
    );
    
    res.json(attendance);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get attendance for a specific date (Admin) - Optimized
router.get('/date/:date', protect, adminOnly, async (req, res) => {
  try {
    const { date } = req.params;
    const attendance = await Attendance.find({ date })
      .populate('studentId', 'name class')
      .lean()
      .select('studentId status');
    res.json(attendance);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update attendance (Admin)
router.put('/:id', protect, adminOnly, async (req, res) => {
  try {
    const attendance = await Attendance.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(attendance);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
