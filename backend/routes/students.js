const express = require('express');
const router = express.Router();
const Student = require('../models/Student');
const User = require('../models/User');
const Fee = require('../models/Fee');
const { protect, adminOnly } = require('../middleware/auth');

// Get student count (Admin) - Optimized for dashboard
router.get('/count', protect, adminOnly, async (req, res) => {
  try {
    const count = await Student.countDocuments();
    res.json({ count });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get all students (Admin) - Optimized with pagination
router.get('/', protect, adminOnly, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
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

    // Get total count for pagination
    const total = await Student.countDocuments(searchQuery);

    const students = await Student.find(searchQuery)
      .populate('parentId', 'name phoneNumber')
      .lean()
      .select('name class schoolName parentId rollNumber dateOfBirth joiningDate monthlyFee')
      .sort({ name: 1 })
      .skip(skip)
      .limit(limit)
      .hint({ name: 1 });
    
    res.set('Cache-Control', 'private, max-age=60');
    res.json({
      students,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching students:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get students by parent - Optimized with caching
router.get('/my-students', protect, async (req, res) => {
  try {
    const students = await Student.find({ parentId: req.user._id })
      .lean()
      .select('name class schoolName rollNumber dateOfBirth joiningDate monthlyFee')
      .sort({ name: 1 })
      .hint({ parentId: 1 }); // Use index
    
    // Set cache headers
    res.set('Cache-Control', 'private, max-age=120'); // Cache for 2 minutes
    res.json(students);
  } catch (error) {
    console.error('Error fetching my students:', error);
    res.status(500).json({ message: error.message });
  }
});

// Add student (Admin)
router.post('/', protect, adminOnly, async (req, res) => {
  try {
    const { name, schoolName, class: studentClass, parentPhoneNumber, rollNumber, dateOfBirth } = req.body;

    let parent = await User.findOne({ phoneNumber: parentPhoneNumber });
    if (!parent) {
      parent = await User.create({
        name: req.body.parentName || 'Parent',
        phoneNumber: parentPhoneNumber,
        password: 'parent123',
        role: 'parent'
      });
    }

    const student = await Student.create({
      name,
      schoolName,
      class: studentClass,
      parentId: parent._id,
      rollNumber,
      dateOfBirth
    });

    res.status(201).json(student);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Add student without parent (Admin)
router.post('/add-only', protect, adminOnly, async (req, res) => {
  try {
    const { name, class: studentClass } = req.body;

    const student = await Student.create({
      name,
      schoolName: 'N/A',
      class: studentClass
    });

    res.status(201).json(student);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Link student to parent (Admin)
router.put('/:id/link', protect, adminOnly, async (req, res) => {
  try {
    const { parentId } = req.body;
    
    const student = await Student.findByIdAndUpdate(
      req.params.id,
      { parentId },
      { new: true }
    ).populate('parentId', 'name phoneNumber');
    
    res.json(student);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Unlink student from parent (Admin)
router.put('/:id/unlink', protect, adminOnly, async (req, res) => {
  try {
    const student = await Student.findByIdAndUpdate(
      req.params.id,
      { $unset: { parentId: 1 } },
      { new: true }
    );
    
    res.json(student);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update student (Admin)
router.put('/:id', protect, adminOnly, async (req, res) => {
  try {
    // Get the old student data to check if joining date or monthly fee changed
    const oldStudent = await Student.findById(req.params.id).lean();
    
    if (!oldStudent) {
      return res.status(404).json({ message: 'Student not found' });
    }
    
    // Update the student
    const student = await Student.findByIdAndUpdate(req.params.id, req.body, { new: true });
    
    // Check if joining date or monthly fee changed
    const joiningDateChanged = req.body.joiningDate && 
      new Date(oldStudent.joiningDate).getTime() !== new Date(req.body.joiningDate).getTime();
    const monthlyFeeChanged = req.body.monthlyFee && 
      oldStudent.monthlyFee !== req.body.monthlyFee;
    
    // If joining date or monthly fee changed, regenerate fee cycles
    if (joiningDateChanged || monthlyFeeChanged) {
      console.log(`Regenerating fee cycles for student ${student._id} due to ${joiningDateChanged ? 'joining date' : 'monthly fee'} change`);
      
      // Delete all pending/overdue fees (keep paid/waived)
      await Fee.deleteMany({
        studentId: student._id,
        status: { $in: ['pending', 'overdue'] }
      });
      
      // If joining date changed, also update paid/waived fees to use correct dates
      if (joiningDateChanged && student.joiningDate) {
        const cycleDay = new Date(student.joiningDate).getDate();
        const paidFees = await Fee.find({
          studentId: student._id,
          status: { $in: ['paid', 'waived'] }
        });
        
        for (const fee of paidFees) {
          const periodStart = new Date(fee.periodStart);
          const correctStart = new Date(periodStart.getFullYear(), periodStart.getMonth(), cycleDay);
          const correctEnd = new Date(periodStart.getFullYear(), periodStart.getMonth() + 1, cycleDay - 1, 23, 59, 59, 999);
          
          await Fee.findByIdAndUpdate(fee._id, {
            periodStart: correctStart,
            periodEnd: correctEnd
          });
        }
      }
      
      // Generate new fee cycles (the ensureFeeCycles function will be called on next fee fetch)
      console.log(`Fee cycles regenerated for student ${student._id}`);
    }
    
    res.json(student);
  } catch (error) {
    console.error('Error updating student:', error);
    res.status(500).json({ message: error.message });
  }
});

// Delete student (Admin)
router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    await Student.findByIdAndDelete(req.params.id);
    res.json({ message: 'Student deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
