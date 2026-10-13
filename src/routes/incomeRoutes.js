const express = require("express");
const router = express.Router();
const { addIncome, getIncome } = require("../controllers/incomeController");
const protect = require("../middleware/authMiddleware");
const { cacheMiddleware } = require("../middleware/cacheMiddleware");

router.use(protect);

router.post("/", addIncome);
router.get("/", cacheMiddleware(20000, ["income", "reports"]), getIncome);

module.exports = router;
