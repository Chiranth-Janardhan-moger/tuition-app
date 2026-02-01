const express = require('express');
const router = express.Router();
const Query = require('../models/Query');
const { protect, adminOnly } = require('../middleware/auth');

// Get query stats (Admin) - Optimized for dashboard
router.get('/stats', protect, adminOnly, async (req, res) => {
  try {
    const [openCount, unreadCount] = await Promise.all([
      Query.countDocuments({ status: 'open' }),
      Query.countDocuments({ hasUnreadAdmin: true })
    ]);
    res.json({ openCount, unreadCount });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get queries by parent - Optimized
router.get('/my-queries', protect, async (req, res) => {
  try {
    const queries = await Query.find({ parentId: req.user._id })
      .populate('studentId', 'name class')
      .populate('messages.senderId', 'name role')
      .sort({ createdAt: -1 })
      .limit(50) // Limit to recent 50
      .lean();
    
    res.set('Cache-Control', 'private, max-age=30');
    res.json(queries);
  } catch (error) {
    console.error('Error fetching my queries:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get all queries (Admin) - Optimized
router.get('/', protect, adminOnly, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50; // Reduced default
    const skip = parseInt(req.query.skip) || 0;
    
    const queries = await Query.find()
      .populate('parentId', 'name phoneNumber')
      .populate('studentId', 'name class')
      .populate('messages.senderId', 'name role')
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .lean();
    
    res.set('Cache-Control', 'private, max-age=30');
    res.json(queries);
  } catch (error) {
    console.error('Error fetching queries:', error);
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
      }],
      hasUnreadAdmin: true,
      hasUnreadParent: false
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
    
    if (!query) {
      return res.status(404).json({ message: 'Query not found' });
    }
    
    // Security check: Parents can only message their own queries
    if (req.user.role !== 'admin' && query.parentId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    query.messages.push({
      senderId: req.user._id,
      message: req.body.message
    });
    
    // Mark as unread for the other party
    if (req.user.role === 'admin') {
      query.hasUnreadParent = true;
      query.hasUnreadAdmin = false;
    } else {
      query.hasUnreadAdmin = true;
      query.hasUnreadParent = false;
    }
    
    await query.save();
    
    const updatedQuery = await Query.findById(req.params.id)
      .populate('studentId', 'name class')
      .populate('messages.senderId', 'name role');
    res.json(updatedQuery);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Mark query as read
router.put('/:id/mark-read', protect, async (req, res) => {
  try {
    const query = await Query.findById(req.params.id);
    
    if (!query) {
      return res.status(404).json({ message: 'Query not found' });
    }
    
    // Security check: Parents can only mark their own queries as read
    if (req.user.role !== 'admin' && query.parentId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    if (req.user.role === 'admin') {
      query.hasUnreadAdmin = false;
    } else {
      query.hasUnreadParent = false;
    }
    
    await query.save();
    res.json(query);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Close query (Admin)
router.put('/:id/close', protect, adminOnly, async (req, res) => {
  try {
    const query = await Query.findByIdAndUpdate(
      req.params.id,
      { status: 'closed' },
      { new: true }
    );
    res.json(query);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Reopen query (Admin)
router.put('/:id/reopen', protect, adminOnly, async (req, res) => {
  try {
    const query = await Query.findByIdAndUpdate(
      req.params.id,
      { status: 'open' },
      { new: true }
    );
    res.json(query);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete query (Admin)
router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    const query = await Query.findById(req.params.id);
    
    if (!query) {
      return res.status(404).json({ message: 'Query not found' });
    }
    
    await Query.findByIdAndDelete(req.params.id);
    res.json({ message: 'Query deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
