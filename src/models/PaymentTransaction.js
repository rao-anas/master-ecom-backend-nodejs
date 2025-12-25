const mongoose = require('mongoose');

const paymentTransactionSchema = new mongoose.Schema({
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true,
    index: true,
  },
  transactionId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  amount: {
    type: Number,
    required: true,
    min: [0, 'Amount must be non-negative'],
  },
  currency: {
    type: String,
    default: 'USD',
    uppercase: true,
  },
  paymentMethod: {
    type: String,
    enum: ['stripe', 'cash_on_delivery'],
    required: true,
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed', 'refunded'],
    required: true,
    index: true,
  },
  stripePaymentIntentId: {
    type: String,
    sparse: true,
  },
  stripeChargeId: {
    type: String,
    sparse: true,
  },
  failureReason: {
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
paymentTransactionSchema.index({ createdAt: -1 });

const PaymentTransaction = mongoose.model('PaymentTransaction', paymentTransactionSchema);

module.exports = PaymentTransaction;

