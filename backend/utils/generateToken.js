import jwt from "jsonwebtoken";

const formatKey = (key) => {
  if (!key) return null;
  return key.replace(/\\n/g, "\n");
};

/**
 * Generate access token (short-lived RS256)
 * @param {Object} user - User object with _id and role
 */
export const generateAccessToken = (user) => {
  const payload = {
    userId: user._id || user.id,
    role: user.role,
  };

  const privateKey = formatKey(process.env.JWT_PRIVATE_KEY);
  
  return jwt.sign(payload, privateKey, {
    algorithm: "RS256",
    expiresIn: process.env.JWT_ACCESS_EXPIRY || "15m",
  });
};

/**
 * Generate refresh token (long-lived RS256)
 * @param {string} userId
 * @param {string} jti - Unique identifier for the token
 */
export const generateRefreshToken = (userId, jti) => {
  const payload = { userId, jti };
  const privateKey = formatKey(process.env.JWT_PRIVATE_KEY);

  return jwt.sign(payload, privateKey, {
    algorithm: "RS256",
    expiresIn: process.env.JWT_REFRESH_EXPIRY || "7d",
  });
};

/**
 * Verify token using public key
 */
export const verifyToken = (token) => {
  const publicKey = formatKey(process.env.JWT_PUBLIC_KEY);
  return jwt.verify(token, publicKey, { algorithms: ["RS256"] });
};

// Keep backward compatibility if needed, but prefer specific functions
export const generateToken = generateAccessToken;
