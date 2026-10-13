const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const compression = require("compression");
const performanceMiddleware = require("./middleware/performanceMiddleware");

const authRoutes           = require("./routes/authRoutes");
const loanRoutes           = require("./routes/loanRoutes");
const reportRoutes         = require("./routes/reportRoutes");
const userRoutes           = require("./routes/userRoutes");
const committeeMemberRoutes = require("./routes/committeeMemberRoutes");
const memberRoutes         = require("./routes/memberRoutes");
const collectionRoutes     = require("./routes/collectionRoutes");
const savingRoutes         = require("./routes/savingRoutes");
const expenseRoutes        = require("./routes/expenseRoutes");
const incomeRoutes         = require("./routes/incomeRoutes");

const app = express();

// ── Core middleware ──────────────────────────────────────────────────────────
app.use(performanceMiddleware);
app.use(compression());
app.use(helmet());
app.use(cors({ origin: "*" }));

// Cap request body at 1 MB — prevents accidental large payloads stalling the event loop
app.use(express.json({ limit: "1mb" }));

// ── Rate limiting ─────────────────────────────────────────────────────────────
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: {
    success: false,
    message: "Too many login attempts. Try again later.",
  },
});
app.use("/api/auth/login", loginLimiter);

// ── Health check (no auth — used by Render uptime checks & Flutter warm-up) ──
app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "Maariyamman Kovil API is running",
    timestamp: new Date().toISOString(),
  });
});

// ── Routes ───────────────────────────────────────────────────────────────────
app.use("/api/auth",             authRoutes);
app.use("/api/reports",          reportRoutes);
app.use("/api/loans",            loanRoutes);
app.use("/api/users",            userRoutes);
app.use("/api/committee-members", committeeMemberRoutes);
app.use("/api/members",          memberRoutes);
app.use("/api/collections",      collectionRoutes);
app.use("/api/savings",          savingRoutes);
app.use("/api/expenses",         expenseRoutes);
app.use("/api/income",           incomeRoutes);

// ── 404 handler ───────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: "Route not found" });
});

// ── Global error handler ─────────────────────────────────────────────────────
// Catches any error passed via next(err) in controllers/middleware.
// Without this, unhandled errors leak stack traces to the client.
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(`[ERROR] ${req.method} ${req.originalUrl}`, err);

  const status  = err.status || err.statusCode || 500;
  const message = err.message || "Internal server error";

  res.status(status).json({ success: false, message });
});

module.exports = app;
