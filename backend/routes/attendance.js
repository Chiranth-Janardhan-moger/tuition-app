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
    const { studentId, date, status } = req.body;
    
    // Check if attendance already exists for this student on this date
    const existingAttendance = await Attendance.findOne({ studentId, date });
    
    if (existingAttendance) {
      // Update existing attendance
      existingAttendance.status = status;
      existingAttendance.markedBy = req.user._id;
      await existingAttendance.save();
      return res.json(existingAttendance);
    }
    
    // Create new attendance
    const attendance = await Attendance.create({
      studentId,
      date,
      status,
      markedBy: req.user._id
    });
    res.status(201).json(attendance);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get attendance for a specific date (Admin)
router.get('/date/:date', protect, adminOnly, async (req, res) => {
  try {
    const { date } = req.params;
    const attendance = await Attendance.find({ date }).populate('studentId', 'name class');
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
