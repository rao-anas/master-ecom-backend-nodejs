const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');

// POST /api/v1/upload - Upload an image
router.post('/', requireAuth, requireRole('admin'), upload.single('image'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ status: 'error', message: 'No file uploaded' });
    }

    // Generate URL for the uploaded file
    // In a real app, this might be a full URL pointing to a CDN or static file server
    const fileUrl = `/uploads/${req.file.filename}`;

    res.status(200).json({
        status: 'success',
        data: {
            url: fileUrl
        }
    });
});

module.exports = router;
