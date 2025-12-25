const mongoose = require('mongoose');

const cartItemSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
    min: [1, 'Quantity must be at least 1'],
  },
  unitPrice: {
    type: Number,
    required: true,
    min: [0, 'Unit price must be non-negative'],
  },
  subtotal: {
    type: Number,
    required: true,
    min: [0, 'Subtotal must be non-negative'],
  },
}, { _id: false });

const cartSchema = new mongoose.Schema({
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
  items: {
    type: [cartItemSchema],
    default: [],
  },
  total: {
    type: Number,
    default: 0,
    min: [0, 'Total must be non-negative'],
  },
  expiresAt: {
    type: Date,
    required: true,
    index: { expireAfterSeconds: 0 }, // TTL index
  },
}, {
  timestamps: true,
});

// Validation: Either userId or sessionId must be present
cartSchema.pre('validate', async function() {
  if (!this.userId && !this.sessionId) {
    this.invalidate('userId', 'Either userId or sessionId is required');
    this.invalidate('sessionId', 'Either userId or sessionId is required');
  }
});

// Calculate total before saving
cartSchema.pre('save', async function() {
  this.total = this.items.reduce((sum, item) => sum + item.subtotal, 0);
});

const Cart = mongoose.model('Cart', cartSchema);

module.exports = Cart;

