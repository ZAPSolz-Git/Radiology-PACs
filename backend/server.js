import "dotenv/config";
import express from "express";
import helmet from "helmet";
import cors from "cors";
import mongoSanitize from "express-mongo-sanitize";
import rateLimit from "express-rate-limit";
import morgan from "morgan";
import compression from "compression";
import cookieParser from "cookie-parser";
import swaggerUi from "swagger-ui-express";
import path from "path";
import { fileURLToPath } from "url";
import connectDB from "./config/db.js";
import { initializeSocket } from "./utils/socketSetup.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import authRoutes from "./routes/authRoutes.js";
import patientRoutes from "./routes/patientRoutes.js";
import caseRoutes from "./routes/caseRoutes.js";
import qaRoutes from "./routes/qaRoutes.js";
import radiologistRoutes from "./routes/radiologistRoutes.js";
import templateRoutes from "./routes/templateRoutes.js";
import macroRoutes from "./routes/macroRoutes.js";
import reportRoutes from "./routes/reportRoutes.js";
import billingRoutes from "./routes/billingRoutes.js";
import performanceRoutes from "./routes/performanceRoutes.js";
import pacsRoutes from "./routes/pacsRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import payoutRoutes from "./routes/payoutRoutes.js";
import analyticsRoutes from "./routes/analyticsRoutes.js";
import backupRoutes from "./routes/backupRoutes.js";
import bannerRoutes from "./routes/bannerRoutes.js";
import orthancRoutes from "./routes/orthancRoutes.js";
import internalRoutes from "./routes/internalRoutes.js";
import shareLinkRoutes from "./routes/shareLinkRoutes.js";
import apiKeyRoutes from "./routes/apiKeyRoutes.js";
import webhookRoutes from "./routes/webhookRoutes.js";

import { protect } from "./middleware/authMiddleware.js";
import { serveUploadedFile } from "./controllers/caseController.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { logErrorToFile } from "./middleware/errorLogger.js";
import logger from "./config/logger.js";
import { RATE_LIMIT_CONFIG } from "./constants/index.js";
import { startDicomSCP, stopDicomSCP } from "./config/dicomSCP.js";
import { specs } from "./config/swagger.js";

// Initialize express
const app = express();

// Connect to MongoDB
connectDB();

// Start DICOM C-STORE SCP listener (receives files from PACS via C-MOVE)
// Socket initialization is now deferred until server is listening in server.js
// startDicomSCP();

// Security Middleware
// Set security HTTP headers
app.use(helmet({
  crossOriginResourcePolicy: false,
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      "img-src": ["'self'", "data:", "blob:", "*"],
      "media-src": ["'self'", "data:", "blob:", "*"],
      "connect-src": ["'self'", "*"],
    },
  },
}));

// X-Frame-Options: DENY (Already handled by helmet default, but explicit is better)
app.use((req, res, next) => {
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  next();
});

// Cookie parser
app.use(cookieParser());

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Enable CORS

const allowedOrigins = [
  process.env.FRONTEND_URL,
  ...(process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(",") : []),
  "http://localhost:8080",  //Main frontend
  "http://localhost:3000",  //Dicom Viewer Frontend
  "http://localhost:5000",  //AI Service
  "https://armorray.com"    //Production
].filter(Boolean).map(origin => origin.trim().replace(/\/$/, ""));

// Remove duplicates
const uniqueOrigins = [...new Set(allowedOrigins)];


const corsOptions = {
  origin: (origin, callback) => {
    // allow requests with no origin (like mobile apps or curl/postman)
    if (!origin) return callback(null, true);

    const normalizedOrigin = origin.trim().replace(/\/$/, "");
    if (uniqueOrigins.includes(normalizedOrigin)) {
      return callback(null, true);
    }

    logger.warn(`CORS blocked for origin: ${origin}. Allowed origins: ${uniqueOrigins.join(", ")}`);
    return callback(new Error(`Not allowed by CORS: ${origin}`), false);
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Range", "X-Upload-Mode", "Cookie", "x-share-token"],
  exposedHeaders: ["Content-Range", "X-Content-Range", "Content-Length", "Accept-Ranges", "Set-Cookie"]
};



app.use(cors(corsOptions));

// Response Compression
app.use(compression());

// API Documentation
if (process.env.NODE_ENV === 'development') {
  const swaggerOptions = {
    customCss: `
      .swagger-ui .topbar { background-color: #0f172a; border-bottom: 2px solid #3b82f6; }
      .swagger-ui .info .title { font-family: 'Inter', sans-serif; color: #1e293b; }
      .swagger-ui .info li, .swagger-ui .info p, .swagger-ui .info table { font-family: 'Inter', sans-serif; color: #475569; }
      .swagger-ui .opblock .opblock-summary-path { font-weight: 600; color: #1e293b; }
      .swagger-ui .btn.authorize { background-color: #3b82f6; color: white; border-color: #3b82f6; border-radius: 6px; }
      .swagger-ui .btn.authorize svg { fill: white; }
      .swagger-ui .opblock.opblock-get { background: rgba(59, 130, 246, 0.05); border-color: #3b82f6; }
      .swagger-ui .opblock.opblock-post { background: rgba(16, 185, 129, 0.05); border-color: #10b981; }
      .swagger-ui .opblock.opblock-put { background: rgba(245, 158, 11, 0.05); border-color: #f59e0b; }
      .swagger-ui .opblock.opblock-delete { background: rgba(239, 68, 68, 0.05); border-color: #ef4444; }
    `,
    customSiteTitle: "Armorray API Documentation",
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      filter: true,
    }
  };
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(specs, swaggerOptions));
}

// Rate limiting to prevent brute force attacks
app.set('trust proxy', 1); // Trust the X-Forwarded-For header
const limiter = rateLimit({
  windowMs: RATE_LIMIT_CONFIG.WINDOW_MS, // 15 minutes
  max: RATE_LIMIT_CONFIG.MAX_REQUESTS, // Limit each IP to 100 requests per windowMs
  message: "Too many requests from this IP, please try again later.",
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headerse 
});
app.use("/api/", limiter);

// Stricter rate limiting for auth-sensitive routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Limit each IP to 20 requests per windowMs for auth
  message: "Too many login attempts, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api/auth/login", authLimiter);
app.use("/api/auth/register", authLimiter);
app.use("/api/auth/refresh", authLimiter);

// Body parser middleware (Removed duplicate)
// app.use(express.json({ limit: "1gb" }));
// app.use(express.urlencoded({ extended: true, limit: "1gb" }));

// Data sanitization against NoSQL injection
// Custom middleware to fix compatibility with Express 5 (req.query is read-only)
app.use((req, res, next) => {
  if (req.body) mongoSanitize.sanitize(req.body);
  if (req.params) mongoSanitize.sanitize(req.params);
  if (req.query) mongoSanitize.sanitize(req.query);
  next();
});

// HTTP request logging
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
} else {
  app.use(
    morgan("combined", {
      stream: {
        write: (message) => logger.info(message.trim()),
      },
    })
  );
}

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || "development",
  });
});

// Basic root route
app.get("/", (req, res) => res.send("Server is running..."));

// Static files (DICOMs and Attachments) with explicit CORS for medical data
app.use("/uploads", (req, res, next) => {
  const origin = req.headers.origin;
  if (origin && uniqueOrigins.includes(origin.replace(/\/$/, ""))) {
    res.header("Access-Control-Allow-Origin", origin);
    res.header("Access-Control-Allow-Credentials", "true");
  } else {
    res.header("Access-Control-Allow-Origin", "*");
  }
  res.header("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization, Range", "x-share-token");
  res.header("Access-Control-Expose-Headers", "Content-Range, Content-Length, Accept-Ranges");

  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }
  next();
}, express.static(path.join(__dirname, "uploads")));

// Protected file serving — replaces express.static so auth is enforced
app.use("/uploads", caseRoutes);


// Routes
app.use("/api/auth", authRoutes);
app.use("/api/patients", patientRoutes);
app.use("/api/cases", caseRoutes);
app.use("/api/qa", qaRoutes);
app.use("/api/radiologist", radiologistRoutes);
app.use("/api/templates", templateRoutes);
app.use("/api/macros", macroRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/billing", billingRoutes);
app.use("/api/performance", performanceRoutes);
app.use("/api/pacs", pacsRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/payouts", payoutRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/backups", backupRoutes);
app.use("/api/banners", bannerRoutes);
app.use("/api/orthanc", orthancRoutes);
app.use("/api/internal", internalRoutes);
app.use("/api/share-links", shareLinkRoutes);
app.use("/api/admin/api-keys", apiKeyRoutes);
app.use("/api/v1/external", webhookRoutes);
// Global error handler (must be last)
app.use(logErrorToFile);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  logger.info(
    `Server running in ${process.env.NODE_ENV || "development"
    } mode on http://localhost:${PORT}`
  );
});

// Initialize Socket.io
initializeSocket(server, uniqueOrigins);
logger.info('Socket.io initialized');

// Start DICOM C-STORE SCP listener (receives files from PACS via C-MOVE)
startDicomSCP();
logger.info('DICOM SCP started');

// Graceful shutdown
const gracefulShutdown = (signal) => {
  logger.info(`${signal} received. Closing server gracefully...`);

  // Close DICOM SCP
  stopDicomSCP();

  server.close(() => {
    logger.info("HTTP server closed");

    // Close database connection
    import("mongoose").then((mongoose) => {
      mongoose.default.connection.close(false, () => {
        logger.info("MongoDB connection closed");
        process.exit(0);
      });
    });
  });

  // Force close after 10 seconds
  setTimeout(() => {
    logger.error(
      "Could not close connections in time, forcefully shutting down"
    );
    process.exit(1);
  }, 10000);
};

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));
