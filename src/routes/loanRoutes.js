const express = require("express");

const {
  createLoan,
  getLoans,
  getLoanById,
  addPayment,
  getPayments,
} = require("../controllers/loanController");

const protect = require("../middleware/authMiddleware");

const router = express.Router();

router.use(protect);

router.post("/", createLoan);

router.get("/", getLoans);

router.get("/:id", getLoanById);

router.post("/:loanId/payments", addPayment);

router.get("/:loanId/payments", getPayments);

module.exports = router;
