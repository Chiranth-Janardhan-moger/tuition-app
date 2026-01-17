const mongoose = require('mongoose');

const querySchema = new mongoose.Schema({
  parentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true
  },
  messages: [{
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    message: String,
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  status: {
    type: String,
    enum: ['open', 'closed'],
    default: 'open'
  },
  hasUnreadParent: {
    type: Boolean,
    default: false
  },
  hasUnreadAdmin: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Add indexes for better query performance
querySchema.index({ parentId: 1, createdAt: -1 });
querySchema.index({ status: 1, hasUnreadAdmin: 1 });
querySchema.index({ createdAt: -1 });

module.exports = mongoose.model('Query', querySchema);
