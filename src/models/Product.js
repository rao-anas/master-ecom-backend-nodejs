const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Product name is required'],
    trim: true,
  },
  description: {
    type: String,
    required: [true, 'Product description is required'],
    trim: true,
  },
  price: {
    type: Number,
    required: [true, 'Product price is required'],
    min: [0, 'Price must be non-negative'],
  },
  images: {
    type: [String],
    required: true,
    validate: {
      validator: function(v) {
        return v && v.length > 0;
      },
      message: 'At least one image is required',
    },
  },
  category: {
    type: String,
    required: [true, 'Product category is required'],
    trim: true,
  },
  stock: {
    type: Number,
    required: [true, 'Product stock is required'],
    min: [0, 'Stock must be non-negative'],
  },
  isAvailable: {
    type: Boolean,
    default: true,
  },
  specifications: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
}, {
  timestamps: true,
});

// Update isAvailable based on stock before saving
productSchema.pre('save', async function() {
  this.isAvailable = this.stock > 0;
});

// Create indexes
productSchema.index({ name: 'text', description: 'text' }); // Compound text index
productSchema.index({ category: 1 });
productSchema.index({ price: 1 });
productSchema.index({ stock: 1 });
productSchema.index({ isAvailable: 1 });

const Product = mongoose.model('Product', productSchema);

module.exports = Product;

