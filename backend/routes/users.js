const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { protect, adminOnly } = require('../middleware/auth');

// Get all parents (Admin) - Optimized
router.get('/parents', protect, adminOnly, async (req, res) => {
  try {
    const parents = await User.find({ role: 'parent' })
      .select('-password')
      .lean()
      .sort({ name: 1 });
    res.json(parents);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create parent (Admin)
router.post('/create-parent', protect, adminOnly, async (req, res) => {
  try {
    const { name, phoneNumber, password } = req.body;

    const existingUser = await User.findOne({ phoneNumber });
    if (existingUser) {
      return res.status(400).json({ message: 'User with this phone number already exists' });
    }

    const parent = await User.create({
      name,
      phoneNumber,
      password,
      role: 'parent'
    });

    res.status(201).json({
      id: parent._id,
      name: parent.name,
      phoneNumber: parent.phoneNumber,
      role: parent.role
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete user (Admin)
router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
