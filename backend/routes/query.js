const express = require('express');
const router = express.Router();
const Query = require('../models/Query');
const { protect, adminOnly } = require('../middleware/auth');

// Get queries by parent
router.get('/my-queries', protect, async (req, res) => {
  try {
    const queries = await Query.find({ parentId: req.user._id })
      .populate('studentId', 'name')
      .populate('messages.senderId', 'name role')
      .sort({ createdAt: -1 });
    res.json(queries);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get all queries (Admin)
router.get('/', protect, adminOnly, async (req, res) => {
  try {
    const queries = await Query.find()
      .populate('parentId', 'name')
      .populate('studentId', 'name')
      .populate('messages.senderId', 'name role')
      .sort({ createdAt: -1 });
    res.json(queries);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create query (Parent)
router.post('/', protect, async (req, res) => {
  try {
    const query = await Query.create({
      parentId: req.user._id,
      studentId: req.body.studentId,
      messages: [{
        senderId: req.user._id,
        message: req.body.message
      }]
    });
    res.status(201).json(query);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Add message to query
router.post('/:id/message', protect, async (req, res) => {
  try {
    const query = await Query.findById(req.params.id);
    query.messages.push({
      senderId: req.user._id,
      message: req.body.message
    });
    await query.save();
    
    const updatedQuery = await Query.findById(req.params.id)
      .populate('messages.senderId', 'name role');
    res.json(updatedQuery);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
