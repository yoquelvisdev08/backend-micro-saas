const mongoose = require('mongoose');

const logSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      required: true,
      enum: ['auth', 'site', 'system', 'error', 'test'],
      default: 'system'
    },
    action: {
      type: String,
      required: true,
      enum: [
        'login', 'register', 'logout',  // auth actions
        'create', 'update', 'delete', 'view', // crud actions
        'system', 'error', 'other'      // system actions
      ]
    },
    message: {
      type: String,
      required: true
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    ip: {
      type: String,
      default: null
    }
  },
  { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Indexar para mejor rendimiento en consultas
logSchema.index({ userId: 1, createdAt: -1 });
logSchema.index({ type: 1, action: 1 });

module.exports = mongoose.model('Log', logSchema); 