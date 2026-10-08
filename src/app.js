const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const compression = require("compression");
const performanceMiddleware = require("./middleware/performanceMiddleware");

const authRoutes = require("./routes/authRoutes");
const loanRoutes = require("./routes/loanRoutes");
const reportRoutes = require("./routes/reportRoutes");
const userRoutes = require("./routes/userRoutes");
const committeeMemberRoutes = require("./routes/committeeMemberRoutes");
const memberRoutes = require("./routes/memberRoutes");
const collectionRoutes = require("./routes/collectionRoutes");
const savingRoutes = require("./routes/savingRoutes");

const app = express();

app.use(performanceMiddleware);
app.use(compression());
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

app.use("/api/users", userRoutes);

app.use("/api/committee-members", committeeMemberRoutes);

app.use("/api/members", memberRoutes);

app.use("/api/collections", collectionRoutes);

app.use("/api/savings", savingRoutes);

module.exports = app;
