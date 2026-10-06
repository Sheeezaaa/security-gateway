const mongoose = require('mongoose');

// Only a SHA-256 hash of each refresh token is stored, never the token itself.
const refreshTokenSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  tokenHash: { type: String, required: true, unique: true },
  family: { type: String, required: true },          // groups a rotation chain
  revoked: { type: Boolean, default: false },
  expiresAt: { type: Date, required: true }
});

// MongoDB auto-deletes expired documents
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('RefreshToken', refreshTokenSchema);
