const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Category name is required'],
        unique: true,
        trim: true,
        minlength: [2, 'Name must be at least 2 characters'],
        maxlength: [50, 'Name cannot exceed 50 characters']
    },
    slug: {
        type: String,
        unique: true,
        lowercase: true,
        index: true
    },
    description: {
        type: String,
        maxlength: [500, 'Description cannot exceed 500 characters']
    }
}, {
    timestamps: true
});

// Create slug from name before saving
// Create slug from name before saving
categorySchema.pre('save', async function () {
    if (this.isModified('name')) {
        this.slug = this.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
    }
});

const Category = mongoose.model('Category', categorySchema);

module.exports = Category;
