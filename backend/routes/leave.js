const express = require('express');
const router = express.Router();
const Leave = require('../models/Leave');
const { protect, adminOnly } = require('../middleware/auth');

// Get leave requests by student
router.get('/student/:studentId', protect, async (req, res) => {
  try {
    const leaves = await Leave.find({ studentId: req.params.studentId })
      .populate('studentId', 'name class')
      .sort({ createdAt: -1 });
    res.json(leaves);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get all leave requests (Admin)
router.get('/', protect, adminOnly, async (req, res) => {
  try {
    const leaves = await Leave.find()
      .populate('studentId', 'name class')
      .populate('parentId', 'name phoneNumber')
      .sort({ createdAt: -1 });
    res.json(leaves);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create leave request (Parent)
router.post('/', protect, async (req, res) => {
  try {
    const leave = await Leave.create({
      ...req.body,
      parentId: req.user._id
    });
    res.status(201).json(leave);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete leave (Admin)
router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    await Leave.findByIdAndDelete(req.params.id);
    res.json({ message: 'Leave deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
