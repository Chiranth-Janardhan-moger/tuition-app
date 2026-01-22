const express = require('express');
const router = express.Router();
const Fee = require('../models/Fee');
const Student = require('../models/Student');
const { protect, adminOnly } = require('../middleware/auth');

// Helper function to generate fee cycles
const generateFeeCycles = (joiningDate, monthlyFee, monthsAhead = 12) => {
  const cycles = [];
  const today = new Date();
  
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

// Helper function to check and create missing fee cycles (OPTIMIZED)
const ensureFeeCycles = async (studentId) => {
  try {
    const student = await Student.findById(studentId).lean();
    if (!student || !student.joiningDate || !student.monthlyFee) {
      return;
    }
    
    const cycles = generateFeeCycles(student.joiningDate, student.monthlyFee, 2);
    
    if (cycles.length === 0) {
      return;
    }
    
    // Get all existing fees in one query
    const existingFees = await Fee.find({
      studentId,
      periodStart: { $in: cycles.map(c => c.periodStart) }
    }).lean();
    
    const existingDates = new Set(existingFees.map(f => f.periodStart.toISOString()));
    
    // Find cycles that don't exist
    const today = new Date();
    const newCycles = cycles
      .filter(cycle => !existingDates.has(cycle.periodStart.toISOString()))
      .map(cycle => ({
        studentId,
        ...cycle,
        status: today > cycle.periodEnd ? 'overdue' : 'pending'
      }));
    
    // Bulk insert new cycles
    if (newCycles.length > 0) {
      await Fee.insertMany(newCycles);
    }
    
    // Update overdue status in bulk
    await Fee.updateMany(
      {
        studentId,
        status: 'pending',
        periodEnd: { $lt: today }
      },
      { $set: { status: 'overdue' } }
    );
  } catch (error) {
    console.error('Error in ensureFeeCycles:', error);
    // Don't throw - allow the request to continue
  }
};

// Get fee records for a student (Parent)
router.get('/student/:studentId', protect, async (req, res) => {
  try {
    const student = await Student.findById(req.params.studentId).lean();
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }
    
    // Ensure fee cycles are created (optimized)
    await ensureFeeCycles(req.params.studentId);
    
    // Get all fee records with index
    const fees = await Fee.find({ studentId: req.params.studentId })
      .sort({ periodStart: 1 })
      .select('feeName feeAmount periodStart periodEnd status paidDate remarks')
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
    console.error('Error loading fees:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get all students with fee summary (Admin) - OPTIMIZED
router.get('/all-students', protect, adminOnly, async (req, res) => {
  try {
    const students = await Student.find()
      .populate('parentId', 'name phoneNumber')
      .select('name class rollNumber parentId joiningDate monthlyFee')
      .lean();
    
    // Ensure cycles for all students in parallel (limited concurrency)
    const batchSize = 5;
    for (let i = 0; i < students.length; i += batchSize) {
      const batch = students.slice(i, i + batchSize);
      await Promise.all(
        batch.map(student => 
          student.joiningDate && student.monthlyFee 
            ? ensureFeeCycles(student._id) 
            : Promise.resolve()
        )
      );
    }
    
    // Get all fee counts in one aggregation
    const feeCounts = await Fee.aggregate([
      {
        $match: {
          studentId: { $in: students.map(s => s._id) }
        }
      },
      {
        $group: {
          _id: '$studentId',
          pendingCount: {
            $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
          },
          overdueCount: {
            $sum: { $cond: [{ $eq: ['$status', 'overdue'] }, 1, 0] }
          }
        }
      }
    ]);
    
    // Get next unpaid fees
    const nextUnpaidFees = await Fee.aggregate([
      {
        $match: {
          studentId: { $in: students.map(s => s._id) },
          status: { $in: ['pending', 'overdue'] }
        }
      },
      {
        $sort: { periodStart: 1 }
      },
      {
        $group: {
          _id: '$studentId',
          nextDue: { $first: '$periodEnd' }
        }
      }
    ]);
    
    // Create lookup maps
    const feeCountMap = new Map(feeCounts.map(f => [f._id.toString(), f]));
    const nextDueMap = new Map(nextUnpaidFees.map(f => [f._id.toString(), f.nextDue]));
    
    // Combine data
    const studentsWithFees = students.map(student => {
      const studentId = student._id.toString();
      const counts = feeCountMap.get(studentId) || { pendingCount: 0, overdueCount: 0 };
      
      return {
        ...student,
        pendingFees: counts.pendingCount,
        overdueFees: counts.overdueCount,
        nextDue: nextDueMap.get(studentId) || null
      };
    });
    
    res.json(studentsWithFees);
  } catch (error) {
    console.error('Error loading students with fees:', error);
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

// Take action on specific fee (Admin) - Mark as paid or waived
router.post('/:feeId/action', protect, adminOnly, async (req, res) => {
  try {
    const { action, remarks } = req.body; // action: 'paid' or 'waived'
    
    console.log('Fee action request:', { feeId: req.params.feeId, action, remarks });
    
    const fee = await Fee.findById(req.params.feeId);
    if (!fee) {
      console.log('Fee not found:', req.params.feeId);
      return res.status(404).json({ message: 'Fee not found' });
    }
    
    console.log('Fee found:', fee);
    
    if (action === 'paid') {
      fee.status = 'paid';
      fee.paidDate = new Date();
      fee.paidBy = req.user._id;
    } else if (action === 'waived') {
      fee.status = 'waived';
      fee.paidDate = new Date();
      fee.paidBy = req.user._id;
    } else {
      return res.status(400).json({ message: 'Invalid action. Must be "paid" or "waived"' });
    }
    
    if (remarks) {
      fee.remarks = remarks;
    }
    
    await fee.save();
    
    console.log('Fee updated successfully:', fee);
    
    res.json({ message: 'Action completed', fee });
  } catch (error) {
    console.error('Error in fee action:', error);
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
