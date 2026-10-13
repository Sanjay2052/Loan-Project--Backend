const express = require("express");

const {
  getReports,
} = require("../controllers/reportController");

const protect = require("../middleware/authMiddleware");
const { cacheMiddleware } = require("../middleware/cacheMiddleware");

const router = express.Router();

router.get("/", protect, cacheMiddleware(180000, ["reports"]), getReports);


module.exports = router;
