const mongoose = require('mongoose');

const inventoryLogSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
    index: true,
  },
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    sparse: true,
    index: true,
  },
  changeType: {
    type: String,
    enum: ['sale', 'restock', 'adjustment', 'return'],
    required: true,
  },
  quantityChange: {
    type: Number,
    required: true,
  },
  previousStock: {
    type: Number,
    required: true,
  },
  newStock: {
    type: Number,
    required: true,
  },
  reason: {
    type: String,
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
}, {
  timestamps: true,
});

// Index on createdAt for sorting
inventoryLogSchema.index({ createdAt: -1 });
inventoryLogSchema.index({ productId: 1, createdAt: -1 });

const InventoryLog = mongoose.model('InventoryLog', inventoryLogSchema);

module.exports = InventoryLog;

