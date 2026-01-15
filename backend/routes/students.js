const express = require('express');
const router = express.Router();
const Student = require('../models/Student');
const User = require('../models/User');
const { protect, adminOnly } = require('../middleware/auth');

// Get all students (Admin)
router.get('/', protect, adminOnly, async (req, res) => {
  try {
    const students = await Student.find().populate('parentId', 'name email phone');
    res.json(students);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get students by parent
router.get('/my-students', protect, async (req, res) => {
  try {
    const students = await Student.find({ parentId: req.user._id });
    res.json(students);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Add student (Admin)
router.post('/', protect, adminOnly, async (req, res) => {
  try {
    const { name, schoolName, class: studentClass, parentEmail, rollNumber, dateOfBirth } = req.body;

    let parent = await User.findOne({ email: parentEmail });
    if (!parent) {
      parent = await User.create({
        name: req.body.parentName || 'Parent',
        email: parentEmail,
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
    ).populate('parentId', 'name email');
    
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
    const student = await Student.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(student);
  } catch (error) {
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
