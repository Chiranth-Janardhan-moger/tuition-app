const express = require('express');
const router = express.Router();
const Attendance = require('../models/Attendance');
const { protect, adminOnly } = require('../middleware/auth');

// Get attendance by student
router.get('/student/:studentId', protect, async (req, res) => {
  try {
    const { month, year } = req.query;
    let query = { studentId: req.params.studentId };
    
    if (month && year) {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0);
      query.date = { $gte: startDate, $lte: endDate };
    }

    const attendance = await Attendance.find(query).sort({ date: -1 });
    res.json(attendance);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Mark attendance (Admin)
router.post('/', protect, adminOnly, async (req, res) => {
  try {
    const attendance = await Attendance.create({
      ...req.body,
      markedBy: req.user._id
    });
    res.status(201).json(attendance);
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
