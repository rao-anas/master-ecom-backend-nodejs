const mongoose = require('mongoose');

const refreshTokenSchema = new mongoose.Schema({
    token: {
        type: String,
        required: true,
        unique: true,
        index: true,
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true,
    },
    expiresAt: {
        type: Date,
        required: true,
        index: { expires: 0 }, // TTL index to automatically delete expired tokens
    },
    createdByIp: {
        type: String,
    },
    revokedAt: {
        type: Date,
    },
    revokedByIp: {
        type: String,
    },
    replacedByToken: {
        type: String,
    },
}, {
    timestamps: true,
});

// Virtual for checking if token is expired
refreshTokenSchema.virtual('isExpired').get(function () {
    return Date.now() >= this.expiresAt;
});

// Virtual for checking if token is active (not expired and not revoked)
refreshTokenSchema.virtual('isActive').get(function () {
    return !this.revokedAt && !this.isExpired;
});

const RefreshToken = mongoose.model('RefreshToken', refreshTokenSchema);

module.exports = RefreshToken;
