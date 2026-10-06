const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

const authRoutes = require("./routes/authRoutes");
const loanRoutes = require("./routes/loanRoutes");
const reportRoutes = require("./routes/reportRoutes");

const app = express();

app.use(helmet());

app.use(
  cors({
    origin: "*",
  })
);

app.use(express.json());

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: {
    success: false,
    message: "Too many login attempts. Try again later.",
  },
});

app.use("/api/auth/login", loginLimiter);

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "Maariyamman Kovil API is running",
  });
});

app.use("/api/auth", authRoutes);

app.use("/api/reports", reportRoutes);

app.use("/api/loans", loanRoutes);

module.exports = app;
