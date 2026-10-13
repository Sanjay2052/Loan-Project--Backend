const express = require("express");
const protect = require("../middleware/authMiddleware");
const { cacheMiddleware } = require("../middleware/cacheMiddleware");
const { addExpense, getExpenses } = require("../controllers/expenseController");

const router = express.Router();

router.post("/", protect, addExpense);
router.get("/", protect, cacheMiddleware(20000, ["expenses", "reports"]), getExpenses);

module.exports = router;
