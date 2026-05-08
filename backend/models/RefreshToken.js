import mongoose from "mongoose";

const RefreshTokenSchema = new mongoose.Schema({
  token: {
    type: String,
    required: true,
    index: true, // SHA-256 hash
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  familyId: {
    type: String,
    required: true,
    index: true,
  },
  expiry: {
    type: Date,
    required: true,
  },
  createdByIp: String,
  revoked: Date,
  revokedByIp: String,
  replacedByToken: String, // The new token issued in rotation
}, { timestamps: true });

// Check if token is expired
RefreshTokenSchema.methods.isExpired = function() {
  return Date.now() >= this.expiry;
};

// Check if token is active (not revoked and not expired)
RefreshTokenSchema.methods.isActive = function() {
  return !this.revoked && !this.isExpired();
};

const RefreshToken = mongoose.model("RefreshToken", RefreshTokenSchema);
export default RefreshToken;
