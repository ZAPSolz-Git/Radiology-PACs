import crypto from "crypto";

/**
 * Hash a token using SHA-256
 * @param {string} token 
 * @returns {string}
 */
export const hashToken = (token) => {
  return crypto.createHash("sha256").update(token).digest("hex");
};

/**
 * Get cookie options for Auth tokens
 * @param {string} type - 'access' or 'refresh'
 * @returns {Object}
 */
export const getCookieOptions = (type = "access") => {
  const isDev = process.env.NODE_ENV === "development";
  
  const options = {
    httpOnly: true,
    secure: !isDev, // true in prod, false in dev (if not using https locally)
    sameSite: isDev ? "lax" : "strict",
    path: "/",
    domain: isDev ? undefined : process.env.COOKIE_DOMAIN || ".armorray.com",
  };

  if (type === "refresh") {
    // Refresh tokens are valid for 7 days
    options.maxAge = 7 * 24 * 60 * 60 * 1000;
  } else {
    // Access tokens are valid for 15 minutes
    options.maxAge = 15 * 60 * 1000;
  }

  return options;
};
