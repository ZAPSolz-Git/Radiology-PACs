export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  ACCEPTED: 202,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
};

export const ERROR_MESSAGES = {
  INVALID_CREDENTIALS: "Invalid email or password",
  EMAIL_ALREADY_EXISTS: "Email already registered",
  USER_NOT_FOUND: "User not found",
  UNAUTHORIZED_ACCESS: "Unauthorized access",
  INVALID_TOKEN: "Invalid or expired token",
  SERVER_ERROR: "Internal server error",
  VALIDATION_ERROR: "Validation error",
  PASSWORD_MIN_LENGTH: "Password must be at least 6 characters",
  INVALID_EMAIL: "Valid email is required",
  NAME_REQUIRED: "Name is required",
  PASSWORD_REQUIRED: "Password is required",
  EMAIL_REQUIRED: "Email is required",
};

export const SUCCESS_MESSAGES = {
  REGISTERED_SUCCESS: "User registered successfully",
  LOGIN_SUCCESS: "Logged in successfully",
  LOGOUT_SUCCESS: "Logged out successfully",
  FETCHED_SUCCESSFULLY: "Data fetched successfully",
};

export const JWT_CONFIG = {
  ACCESS_TOKEN_EXPIRY: "30m",
  REFRESH_TOKEN_EXPIRY: "7d",
};

export const RATE_LIMIT_CONFIG = {
  WINDOW_MS: 15 * 60 * 1000,
  MAX_REQUESTS: 100,
};
