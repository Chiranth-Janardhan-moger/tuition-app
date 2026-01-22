const express = require('express');
const router = express.Router();
const Fee = require('../models/Fee');
const Student = require('../models/Student');
const { protect, adminOnly } = require('../middleware/auth');

// Helper function to generate fee cycles
const generateFeeCycles = (joiningDate, monthlyFee, monthsAhead = 12) => {
  const cycles = [];
  const today = new Date();
  const joiningDay = joiningDate.getDate();
  
  let currentStart = new Date(joiningDate);
  
  // Generate cycles from joining date until monthsAhead from now
  for (let i = 0; i < 100; i++) { // Max 100 cycles to prevent infinite loop
    const periodStart = new Date(currentStart);
    
    // Calculate period end (one day before same date next month)
    const periodEnd = new Date(periodStart);
    periodEnd.setMonth(periodEnd.getMonth() + 1);
    periodEnd.setDate(periodEnd.getDate() - 1);
    
    // Stop if we've gone too far into the future
    const futureLimit = new Date(today);
    futureLimit.setMonth(futureLimit.getMonth() + monthsAhead);
    if (periodStart > futureLimit) break;
    
    // Get month name for fee name
    const monthName = periodStart.toLocaleString('en-US', { month: 'long' });
    const year = periodStart.getFullYear();
    const feeName = `${monthName} ${year} Fee`;
    
    cycles.push({
      feeName,
      feeAmount: monthlyFee,
      periodStart,
      periodEnd
    });
    
    // Move to next cycle
    currentStart = new Date(periodEnd);
    currentStart.setDate(currentStart.getDate() + 1);
  }
  
  return cycles;
};

// Helper function to check and create missing fee cycles
const ensureFeeCycles = async (studentId) => {
  const student = await Student.findById(studentId);
  if (!student || !student.joiningDate || !student.monthlyFee) {
    return;
  }
  
  const cycles = generateFeeCycles(student.joiningDate, student.monthlyFee, 2);
  
  for (const cycle of cycles) {
    // Check if this cycle already exists
    const existing = await Fee.findOne({
      studentId,
      periodStart: cycle.periodStart
    });
    
    if (!existing) {
      // Determine status
      const today = new Date();
      let status = 'pending';
      if (today > cycle.periodEnd) {
        status = 'overdue';
      }
      
      await Fee.create({
        studentId,
        ...cycle,
        status
      });
    } else {
      // Update status if needed
      const today = new Date();
      if (existing.status === 'pending' && today > existing.periodEnd) {
        existing.status = 'overdue';
        await existing.save();
      }
    }
  }
};

// Get fee records for a student (Parent)
router.get('/student/:studentId', protect, async (req, res) => {
  try {
    const student = await Student.findById(req.params.studentId);
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }
    
    // Ensure fee cycles are created
    await ensureFeeCycles(req.params.studentId);
    
    // Get all fee records
    const fees = await Fee.find({ studentId: req.params.studentId })
      .sort({ periodStart: 1 })
      .lean();
    
    res.json({
      student: {
        name: student.name,
        joiningDate: student.joiningDate,
        monthlyFee: student.monthlyFee
      },
      fees
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get all students with fee summary (Admin)
router.get('/all-students', protect, adminOnly, async (req, res) => {
  try {
    const students = await Student.find()
      .populate('parentId', 'name phoneNumber')
      .lean();
    
    const studentsWithFees = await Promise.all(
      students.map(async (student) => {
        if (!student.joiningDate || !student.monthlyFee) {
          return {
            ...student,
            pendingFees: 0,
            overdueFees: 0,
            nextDue: null
          };
        }
        
        await ensureFeeCycles(student._id);
        
        const pendingCount = await Fee.countDocuments({
          studentId: student._id,
          status: 'pending'
        });
        
        const overdueCount = await Fee.countDocuments({
          studentId: student._id,
          status: 'overdue'
        });
        
        const nextUnpaid = await Fee.findOne({
          studentId: student._id,
          status: { $in: ['pending', 'overdue'] }
        }).sort({ periodStart: 1 });
        
        return {
          ...student,
          pendingFees: pendingCount,
          overdueFees: overdueCount,
          nextDue: nextUnpaid ? nextUnpaid.periodEnd : null
        };
      })
    );
    
    res.json(studentsWithFees);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Mark fee as paid (Admin) - Automatically assigns to earliest unpaid
router.post('/mark-paid/:studentId', protect, adminOnly, async (req, res) => {
  try {
    const { remarks } = req.body;
    
    // Ensure cycles exist
    await ensureFeeCycles(req.params.studentId);
    
    // Find earliest unpaid fee
    const unpaidFee = await Fee.findOne({
      studentId: req.params.studentId,
      status: { $in: ['pending', 'overdue'] }
    }).sort({ periodStart: 1 });
    
    if (!unpaidFee) {
      return res.status(404).json({ message: 'No unpaid fees found' });
    }
    
    // Mark as paid
    unpaidFee.status = 'paid';
    unpaidFee.paidDate = new Date();
    unpaidFee.paidBy = req.user._id;
    unpaidFee.remarks = remarks;
    await unpaidFee.save();
    
    res.json({
      message: 'Fee marked as paid',
      fee: unpaidFee
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update student fee details (Admin)
router.put('/student/:studentId/settings', protect, adminOnly, async (req, res) => {
  try {
    const { joiningDate, monthlyFee } = req.body;
    
    const student = await Student.findByIdAndUpdate(
      req.params.studentId,
      { joiningDate, monthlyFee },
      { new: true }
    );
    
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }
    
    // Regenerate fee cycles
    await ensureFeeCycles(req.params.studentId);
    
    res.json(student);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get overdue count (for dashboard)
router.get('/overdue-count', protect, adminOnly, async (req, res) => {
  try {
    const count = await Fee.countDocuments({ status: 'overdue' });
    res.json({ count });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
