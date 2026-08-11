import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  caseId: {
    type: String,
    required: true,
    index: true
  },
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  senderName: {
    type: String,
    required: true
  },
  senderRole: {
    type: String,
    enum: ['user', 'technician', 'radiologist', 'admin', 'qa'],
    required: true
  },
  text: {
    type: String,
    required: true
  },
  messageType: {
    type: String,
    enum: ['text', 'image', 'file', 'system'],
    default: 'text'
  },
  chatType: {
    type: String,
    enum: ['technician', 'radiologist', 'qa', 'group'],
    default: 'group'
  },
  readBy: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  deliveredTo: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  isDeleted: {
    type: Boolean,
    default: false
  },
  deletedAt: {
    type: Date
  },
  isEdited: {
    type: Boolean,
    default: false
  },
  editedAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Indexes for efficient querying
messageSchema.index({ caseId: 1, createdAt: -1 }); // For getting messages by case sorted by time
messageSchema.index({ senderId: 1 }); // For getting messages by sender
messageSchema.index({ createdAt: -1 }); // For chronological sorting

export default mongoose.model('Message', messageSchema);
