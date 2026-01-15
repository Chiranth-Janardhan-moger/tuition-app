const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const { protect } = require('../middleware/auth');

// Get group chat messages
router.get('/group', protect, async (req, res) => {
  try {
    const messages = await Message.find({ type: 'group' })
      .populate('senderId', 'name role')
      .sort({ createdAt: 1 })
      .limit(100);
    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Send group message
router.post('/group', protect, async (req, res) => {
  try {
    const message = await Message.create({
      senderId: req.user._id,
      message: req.body.message,
      type: 'group'
    });
    
    const populatedMessage = await Message.findById(message._id).populate('senderId', 'name role');
    res.status(201).json(populatedMessage);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
