const express = require('express');
const router = express.Router();
const Fee = require('../models/Fee');
const Student = require('../models/Student');
const { protect, adminOnly } = require('../middleware/auth');

// Get fee record by student
router.get('/student/:studentId', protect, async (req, res) => {
  try {
    let feeRecord = await Fee.findOne({ studentId: req.params.studentId })
      .populate('studentId', 'name class')
      .populate('payments.addedBy', 'name');
    
    if (!feeRecord) {
      return res.json(null);
    }
    
    res.json(feeRecord);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get all students with fee info (Admin)
router.get('/all', protect, adminOnly, async (req, res) => {
  try {
    const students = await Student.find().select('name class');
    const feeRecords = await Fee.find().populate('studentId', 'name class');
    
    const studentsWithFees = students.map(student => {
      const feeRecord = feeRecords.find(f => f.studentId._id.toString() === student._id.toString());
      return {
        student,
        feeRecord: feeRecord || null
      };
    });
    
    res.json(studentsWithFees);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create or update fee record (Admin)
router.post('/setup', protect, adminOnly, async (req, res) => {
  try {
    const { studentId, monthlyAmount, nextDueDate } = req.body;
    
    let feeRecord = await Fee.findOne({ studentId });
    
    if (feeRecord) {
      feeRecord.monthlyAmount = monthlyAmount;
      feeRecord.nextDueDate = nextDueDate;
      await feeRecord.save();
    } else {
      feeRecord = await Fee.create({
        studentId,
        monthlyAmount,
        nextDueDate,
        payments: []
      });
    }
    
    res.json(feeRecord);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Add payment (Admin)
router.post('/:id/payment', protect, adminOnly, async (req, res) => {
  try {
    const { amount, paidDate, remarks } = req.body;
    
    const feeRecord = await Fee.findById(req.params.id);
    
    if (!feeRecord) {
      return res.status(404).json({ message: 'Fee record not found' });
    }
    
    // Add payment to history
    feeRecord.payments.push({
      amount,
      paidDate: new Date(paidDate),
      remarks,
      addedBy: req.user._id
    });
    
    // Auto-calculate next due date (30 days from paid date)
    const lastPaidDate = new Date(paidDate);
    const nextDue = new Date(lastPaidDate);
    nextDue.setDate(nextDue.getDate() + 30);
    feeRecord.nextDueDate = nextDue;
    
    await feeRecord.save();
    
    const updated = await Fee.findById(req.params.id)
      .populate('studentId', 'name class')
      .populate('payments.addedBy', 'name');
    
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update next due date (Admin)
router.put('/:id/due-date', protect, adminOnly, async (req, res) => {
  try {
    const { nextDueDate } = req.body;
    
    const feeRecord = await Fee.findByIdAndUpdate(
      req.params.id,
      { nextDueDate: new Date(nextDueDate) },
      { new: true }
    ).populate('studentId', 'name class');
    
    res.json(feeRecord);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete payment (Admin)
router.delete('/:feeId/payment/:paymentId', protect, adminOnly, async (req, res) => {
  try {
    const feeRecord = await Fee.findById(req.params.feeId);
    
    if (!feeRecord) {
      return res.status(404).json({ message: 'Fee record not found' });
    }
    
    feeRecord.payments = feeRecord.payments.filter(
      p => p._id.toString() !== req.params.paymentId
    );
    
    await feeRecord.save();
    
    res.json({ message: 'Payment deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
