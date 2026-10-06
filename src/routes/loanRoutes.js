const express = require("express");

const {
  createLoan,
  getLoans,
  getLoanById,
} = require("../controllers/loanController");

const protect = require("../middleware/authMiddleware");

const router = express.Router();

router.use(protect);

router.post("/", createLoan);

router.get("/", getLoans);

router.get("/:id", getLoanById);

module.exports = router;
