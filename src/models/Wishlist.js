const mongoose = require('mongoose');
const crypto = require('crypto');

const wishlistSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    sparse: true,
    index: true,
  },
  sessionId: {
    type: String,
    sparse: true,
    index: true,
  },
  name: {
    type: String,
    default: 'My Wishlist',
    trim: true,
    maxlength: [100, 'Wishlist name cannot exceed 100 characters'],
  },
  productIds: {
    type: [mongoose.Schema.Types.ObjectId],
    ref: 'Product',
    default: [],
    validate: {
      validator: function(v) {
        return v.length <= 50;
      },
      message: 'Wishlist cannot contain more than 50 products',
    },
  },
  isDefault: {
    type: Boolean,
    default: false,
  },
  isShared: {
    type: Boolean,
    default: false,
  },
  shareToken: {
    type: String,
    unique: true,
    sparse: true,
    index: true,
  },
  expiresAt: {
    type: Date,
    required: false, // Will be set in pre-save hook
    index: { expireAfterSeconds: 0 }, // TTL index
  },
}, {
  timestamps: true,
});

// Validation: Either userId or sessionId must be present
wishlistSchema.pre('validate', async function() {
  if (!this.userId && !this.sessionId) {
    this.invalidate('userId', 'Either userId or sessionId is required');
    this.invalidate('sessionId', 'Either userId or sessionId is required');
  }
  
  // Ensure only one of userId or sessionId is set
  if (this.userId && this.sessionId) {
    this.invalidate('userId', 'Cannot have both userId and sessionId');
    this.invalidate('sessionId', 'Cannot have both userId and sessionId');
  }
  
  // Remove duplicates from productIds
  if (this.productIds && this.productIds.length > 0) {
    const uniqueIds = [...new Set(this.productIds.map(id => id.toString()))];
    this.productIds = uniqueIds.map(id => new mongoose.Types.ObjectId(id));
  }
});

// Generate share token before saving if isShared is true
wishlistSchema.pre('save', async function() {
  if (this.isShared && !this.shareToken) {
    // Generate unique share token
    this.shareToken = crypto.randomBytes(32).toString('hex');
  }
  
  if (!this.isShared && this.shareToken) {
    // Remove share token if wishlist is no longer shared
    this.shareToken = undefined;
  }
  
  // Set expiration date if not set (required for TTL index)
  if (!this.expiresAt) {
    if (this.userId) {
      // 60 days for authenticated users
      this.expiresAt = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000);
    } else if (this.sessionId) {
      // Session-based expiration for guests (24 hours)
      this.expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    } else {
      // Default to 60 days if neither userId nor sessionId (shouldn't happen due to validation)
      this.expiresAt = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000);
    }
  }
});

// Compound index for finding default wishlist
wishlistSchema.index({ userId: 1, isDefault: 1 });

// Index for productIds lookups
wishlistSchema.index({ productIds: 1 });

const Wishlist = mongoose.model('Wishlist', wishlistSchema);

module.exports = Wishlist;

