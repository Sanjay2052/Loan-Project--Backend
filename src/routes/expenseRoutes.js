const express = require("express");
const protect = require("../middleware/authMiddleware");
const { addExpense, getExpenses } = require("../controllers/expenseController");

const router = express.Router();

router.post("/", protect, addExpense);
router.get("/", protect, getExpenses);

module.exports = router;
