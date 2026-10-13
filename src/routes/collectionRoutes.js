const express = require("express");
const router = express.Router();
const { getTodayCollection, getTodayCommitteeCollection } = require("../controllers/collectionController");
const protect = require("../middleware/authMiddleware");
const { cacheMiddleware } = require("../middleware/cacheMiddleware");

// Cache today's collection summary for 60 s (date-scoped via ?date=)
router.get("/today", protect, cacheMiddleware(60000, ["collections", "reports"]), getTodayCollection);

// Per-committee-member detail: cache 30 s
router.get(
  "/today/committee/:committeeMemberId",
  protect,
  cacheMiddleware(30000, ["collections"]),
  getTodayCommitteeCollection
);

module.exports = router;
