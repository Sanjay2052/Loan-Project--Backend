const express = require("express");
const router = express.Router();
const { getTodayCollection } = require("../controllers/collectionController");
const { protect } = require("../middleware/authMiddleware");

router.get("/today", protect, getTodayCollection);

module.exports = router;
