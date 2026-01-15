const express = require('express');
const router = express.Router();
const Leave = require('../models/Leave');
const { protect, adminOnly } = require('../middleware/auth');

// Get leave requests by student
router.get('/student/:studentId', protect, async (req, res) => {
  try {
    const leaves = await Leave.find({ studentId: req.params.studentId }).sort({ createdAt: -1 });
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
      .populate('parentId', 'name')
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

// Update leave status (Admin)
router.put('/:id', protect, adminOnly, async (req, res) => {
  try {
    const leave = await Leave.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(leave);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
