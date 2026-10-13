const express = require("express");

const {
  createLoan,
  getLoans,
  getLoanById,
  updateLoan,
  deleteLoan,
  cancelLoan,
  addPayment,
  getPayments,
  editPayment,
} = require("../controllers/loanController");

const protect = require("../middleware/authMiddleware");
const { cacheMiddleware } = require("../middleware/cacheMiddleware");

const router = express.Router();

router.use(protect);

// Write operations → handled by controller cache-clear
router.post("/", createLoan);

// List with pagination — 30 s cache tagged 'loans'
router.get("/", cacheMiddleware(30000, ["loans"]), getLoans);

// Single loan detail — 30 s cache tagged 'loans'
router.get("/:id", cacheMiddleware(30000, ["loans"]), getLoanById);

router.put("/:id", updateLoan);
router.delete("/:id", deleteLoan);
router.put("/:id/status", cancelLoan);

// Payment write
router.post("/:loanId/payments", addPayment);

// Payment history for a loan — 20 s cache tagged 'loans'
router.get("/:loanId/payments", cacheMiddleware(20000, ["loans"]), getPayments);

// Payment edit
router.put("/:loanId/payments/:paymentId", editPayment);

module.exports = router;
