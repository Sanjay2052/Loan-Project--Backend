const express = require("express");
const router = express.Router();
const { getTodayCollection, getTodayCommitteeCollection } = require("../controllers/collectionController");
const { protect } = require("../middleware/authMiddleware");

router.get("/today", protect, getTodayCollection);
router.get("/today/committee/:committeeMemberId", protect, getTodayCommitteeCollection);

module.exports = router;
