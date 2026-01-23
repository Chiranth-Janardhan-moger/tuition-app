const express = require('express');
const router = express.Router();
const Fee = require('../models/Fee');
const Student = require('../models/Student');
const { protect, adminOnly } = require('../middleware/auth');

// Helper function to generate fee cycles
const generateFeeCycles = (joiningDate, monthlyFee, monthsAhead = 12) => {
  const cycles = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const startDate = new Date(joiningDate);
  startDate.setHours(0, 0, 0, 0);
  
  // Start from the 1st of the joining month
  const joiningMonth = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
  joiningMonth.setHours(0, 0, 0, 0);
  
  const futureLimit = new Date(today);
  futureLimit.setMonth(futureLimit.getMonth() + monthsAhead);
  
  // Generate cycles month by month starting from joining month
  let monthOffset = 0;
  
  while (monthOffset < 100) {
    // Calculate period start (1st of each month)
    const periodStart = new Date(joiningMonth.getFullYear(), joiningMonth.getMonth() + monthOffset, 1);
    periodStart.setHours(0, 0, 0, 0);
    
    // Stop if we've gone too far into the future
    if (periodStart > futureLimit) break;
    
    // Calculate period end (last day of the same month)
    const periodEnd = new Date(periodStart.getFullYear(), periodStart.getMonth() + 1, 0);
    periodEnd.setHours(23, 59, 59, 999);
    
    // Get month name for fee name
    const monthName = periodStart.toLocaleString('en-US', { month: 'long' });
    const year = periodStart.getFullYear();
    const feeName = `${monthName} ${year} Fee`;
    
    cycles.push({
      feeName,
      feeAmount: monthlyFee,
      periodStart: new Date(periodStart),
      periodEnd: new Date(periodEnd)
    });
    
    monthOffset++;
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
    
    // Get all existing fees
    const existingFees = await Fee.find({ studentId }).sort({ periodStart: 1 }).lean();
    
    // Count unpaid fees (pending + overdue)
    const unpaidCount = existingFees.filter(f => 
      f.status === 'pending' || f.status === 'overdue'
    ).length;
    
    // Always maintain at least 3 unpaid fee cycles
    const minUnpaidCycles = 3;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (unpaidCount >= minUnpaidCycles) {
      // Still update overdue status
      await Fee.updateMany(
        {
          studentId,
          status: 'pending',
          periodEnd: { $lt: today }
        },
        { $set: { status: 'overdue' } }
      );
      return;
    }
    
    // Find the last existing fee month
    let startMonth;
    if (existingFees.length > 0) {
      const lastFee = existingFees[existingFees.length - 1];
      const lastDate = new Date(lastFee.periodStart);
      // Start from the month after the last fee
      startMonth = new Date(lastDate.getFullYear(), lastDate.getMonth() + 1, 1);
    } else {
      // No existing fees, start from joining month
      const joiningDate = new Date(student.joiningDate);
      startMonth = new Date(joiningDate.getFullYear(), joiningDate.getMonth(), 1);
    }
    startMonth.setHours(0, 0, 0, 0);
    
    // Generate enough cycles to have at least 3 unpaid
    const cyclesToCreate = minUnpaidCycles - unpaidCount;
    const newCycles = [];
    
    for (let i = 0; i < cyclesToCreate; i++) {
      const periodStart = new Date(startMonth.getFullYear(), startMonth.getMonth() + i, 1);
      periodStart.setHours(0, 0, 0, 0);
      
      const periodEnd = new Date(periodStart.getFullYear(), periodStart.getMonth() + 1, 0);
      periodEnd.setHours(23, 59, 59, 999);
      
      const monthName = periodStart.toLocaleString('en-US', { month: 'long' });
      const year = periodStart.getFullYear();
      const feeName = `${monthName} ${year} Fee`;
      
      newCycles.push({
        studentId,
        feeName,
        feeAmount: student.monthlyFee,
        periodStart: new Date(periodStart),
        periodEnd: new Date(periodEnd),
        status: today > periodEnd ? 'overdue' : 'pending'
      });
    }
    
    // Bulk insert new cycles
    if (newCycles.length > 0) {
      await Fee.insertMany(newCycles);
      console.log(`Generated ${newCycles.length} new fee cycles for student ${studentId}`);
    }
    
    // Update overdue status ONLY for pending fees (not paid or waived)
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

// Get all students with fee summary (Admin) - OPTIMIZED with pagination
router.get('/all-students', protect, adminOnly, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 30;
    const skip = (page - 1) * limit;
    const search = req.query.search || '';

    // Build search query
    const searchQuery = search
      ? {
          $or: [
            { name: { $regex: search, $options: 'i' } },
            { rollNumber: { $regex: search, $options: 'i' } }
          ]
        }
      : {};

    // Get total count
    const total = await Student.countDocuments(searchQuery);

    const students = await Student.find(searchQuery)
      .populate('parentId', 'name phoneNumber')
      .select('name class rollNumber parentId joiningDate monthlyFee')
      .sort({ name: 1 })
      .skip(skip)
      .limit(limit)
      .lean();
    
    // Get student IDs for this page only
    const studentIds = students.map(s => s._id);
    
    // Ensure cycles for current page students only (limited concurrency)
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
    
    // Get fee counts only for current page students
    const feeCounts = await Fee.aggregate([
      {
        $match: {
          studentId: { $in: studentIds }
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
    
    // Get next unpaid fees for current page students
    const nextUnpaidFees = await Fee.aggregate([
      {
        $match: {
          studentId: { $in: studentIds },
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
    
    res.json({
      students: studentsWithFees,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
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
    const { action, remarks, paidDate } = req.body; // action: 'paid' or 'waived'
    
    console.log('Fee action request:', { feeId: req.params.feeId, action, remarks, paidDate });
    
    const fee = await Fee.findById(req.params.feeId);
    if (!fee) {
      console.log('Fee not found:', req.params.feeId);
      return res.status(404).json({ message: 'Fee not found' });
    }
    
    console.log('Fee found:', fee);
    
    if (action === 'paid') {
      fee.status = 'paid';
      fee.paidDate = paidDate ? new Date(paidDate) : new Date();
      fee.paidBy = req.user._id;
    } else if (action === 'waived') {
      fee.status = 'waived';
      fee.paidDate = paidDate ? new Date(paidDate) : new Date();
      fee.paidBy = req.user._id;
    } else {
      return res.status(400).json({ message: 'Invalid action. Must be "paid" or "waived"' });
    }
    
    if (remarks) {
      fee.remarks = remarks;
    }
    
    await fee.save();
    
    console.log('Fee updated successfully:', fee);
    
    // Generate next fee cycles to maintain 3 unpaid
    await ensureFeeCycles(fee.studentId);
    
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

// Clean up duplicate fee cycles (Admin utility)
router.post('/cleanup-duplicates', protect, adminOnly, async (req, res) => {
  try {
    const students = await Student.find({}).select('_id name').lean();
    let totalRemoved = 0;
    const details = [];
    
    for (const student of students) {
      // Get all fees for this student sorted by creation date
      const fees = await Fee.find({ studentId: student._id })
        .sort({ periodStart: 1, createdAt: 1 })
        .lean();
      
      // Group by month-year (not exact date, to catch all duplicates)
      const feesByMonth = new Map();
      const duplicateIds = [];
      
      for (const fee of fees) {
        const periodDate = new Date(fee.periodStart);
        const monthKey = `${periodDate.getFullYear()}-${String(periodDate.getMonth() + 1).padStart(2, '0')}`;
        
        if (feesByMonth.has(monthKey)) {
          const existing = feesByMonth.get(monthKey);
          
          // Keep paid/waived over pending/overdue
          if ((existing.status === 'paid' || existing.status === 'waived') && 
              (fee.status === 'pending' || fee.status === 'overdue')) {
            // Delete the new one (pending/overdue)
            duplicateIds.push(fee._id);
          } else if ((fee.status === 'paid' || fee.status === 'waived') && 
                     (existing.status === 'pending' || existing.status === 'overdue')) {
            // Delete the old one (pending/overdue) and keep the new one (paid/waived)
            duplicateIds.push(existing._id);
            feesByMonth.set(monthKey, fee);
          } else {
            // Both same status, keep the older one (first created)
            duplicateIds.push(fee._id);
          }
        } else {
          feesByMonth.set(monthKey, fee);
        }
      }
      
      // Delete duplicates
      if (duplicateIds.length > 0) {
        await Fee.deleteMany({ _id: { $in: duplicateIds } });
        totalRemoved += duplicateIds.length;
        details.push({
          studentName: student.name,
          removed: duplicateIds.length
        });
      }
    }
    
    res.json({ 
      message: 'Cleanup completed', 
      duplicatesRemoved: totalRemoved,
      details: details.length > 0 ? details : undefined
    });
  } catch (error) {
    console.error('Error cleaning up duplicates:', error);
    res.status(500).json({ message: error.message });
  }
});

// Regenerate all fee cycles with correct dates (Admin utility)
router.post('/regenerate-cycles', protect, adminOnly, async (req, res) => {
  try {
    const students = await Student.find({
      joiningDate: { $exists: true, $ne: null },
      monthlyFee: { $exists: true, $gt: 0 }
    }).select('_id name joiningDate monthlyFee').lean();
    
    let totalFixed = 0;
    const details = [];
    
    for (const student of students) {
      // Get all existing fees
      const existingFees = await Fee.find({ studentId: student._id }).lean();
      
      // Fix paid/waived fees with wrong dates
      const paidFees = existingFees.filter(f => f.status === 'paid' || f.status === 'waived');
      
      for (const paidFee of paidFees) {
        const periodStart = new Date(paidFee.periodStart);
        const correctStart = new Date(periodStart.getFullYear(), periodStart.getMonth(), 1);
        const correctEnd = new Date(periodStart.getFullYear(), periodStart.getMonth() + 1, 0, 23, 59, 59, 999);
        
        // Check if dates need fixing
        if (periodStart.getDate() !== 1 || 
            new Date(paidFee.periodEnd).getDate() !== correctEnd.getDate()) {
          
          await Fee.findByIdAndUpdate(paidFee._id, {
            periodStart: correctStart,
            periodEnd: correctEnd
          });
          totalFixed++;
        }
      }
      
      // Delete only pending/overdue fees
      const otherFees = existingFees.filter(f => f.status !== 'paid' && f.status !== 'waived');
      if (otherFees.length > 0) {
        await Fee.deleteMany({ 
          _id: { $in: otherFees.map(f => f._id) }
        });
      }
      
      // Generate new cycles
      const cycles = generateFeeCycles(student.joiningDate, student.monthlyFee, 2);
      
      // Create a map of existing paid months (with corrected dates)
      const paidMonths = new Set(
        paidFees.map(f => {
          const d = new Date(f.periodStart);
          return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        })
      );
      
      // Only create cycles for months that don't have paid records
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const newCycles = cycles
        .filter(cycle => {
          const cycleDate = new Date(cycle.periodStart);
          const monthKey = `${cycleDate.getFullYear()}-${String(cycleDate.getMonth() + 1).padStart(2, '0')}`;
          return !paidMonths.has(monthKey);
        })
        .map(cycle => ({
          studentId: student._id,
          ...cycle,
          status: today > new Date(cycle.periodEnd) ? 'overdue' : 'pending'
        }));
      
      if (newCycles.length > 0) {
        await Fee.insertMany(newCycles);
        totalFixed += newCycles.length;
      }
      
      if (paidFees.length > 0 || newCycles.length > 0) {
        details.push({
          studentName: student.name,
          paidFixed: paidFees.length,
          newCreated: newCycles.length
        });
      }
    }
    
    res.json({ 
      message: 'Regeneration completed', 
      totalFixed,
      details: details.length > 0 ? details : undefined
    });
  } catch (error) {
    console.error('Error regenerating cycles:', error);
    res.status(500).json({ message: error.message });
  }
});

// Reset student fee data completely (Admin utility)
router.delete('/student/:studentId/reset', protect, adminOnly, async (req, res) => {
  try {
    const studentId = req.params.studentId;
    
    // Delete all fee records for this student
    const result = await Fee.deleteMany({ studentId });
    
    // Reset fee settings in student record
    await Student.findByIdAndUpdate(studentId, {
      joiningDate: null,
      monthlyFee: 0
    });
    
    res.json({ 
      message: 'Student fee data reset successfully', 
      deletedFees: result.deletedCount 
    });
  } catch (error) {
    console.error('Error resetting student fees:', error);
    res.status(500).json({ message: error.message });
  }
});

// Delete a specific fee record (Admin)
router.delete('/:feeId', protect, adminOnly, async (req, res) => {
  try {
    const fee = await Fee.findByIdAndDelete(req.params.feeId);
    
    if (!fee) {
      return res.status(404).json({ message: 'Fee not found' });
    }
    
    res.json({ message: 'Fee deleted successfully' });
  } catch (error) {
    console.error('Error deleting fee:', error);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
