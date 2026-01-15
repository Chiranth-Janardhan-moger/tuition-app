const express = require('express');
const router = express.Router();
const Fee = require('../models/Fee');
const Student = require('../models/Student');
const { protect, adminOnly } = require('../middleware/auth');

// Get fees by student
router.get('/student/:studentId', protect, async (req, res) => {
  try {
    const fees = await Fee.find({ studentId: req.params.studentId }).sort({ year: -1, month: -1 });
    res.json(fees);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create fee (Admin)
router.post('/', protect, adminOnly, async (req, res) => {
  try {
    const fee = await Fee.create(req.body);
    res.status(201).json(fee);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update fee status (Admin)
router.put('/:id', protect, adminOnly, async (req, res) => {
  try {
    const fee = await Fee.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(fee);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Mark fee as paid (Admin)
router.put('/:id/pay', protect, adminOnly, async (req, res) => {
  try {
    const fee = await Fee.findByIdAndUpdate(
      req.params.id,
      {
        status: 'paid',
        paidDate: new Date(),
        ...req.body
      },
      { new: true }
    );
    res.json(fee);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
