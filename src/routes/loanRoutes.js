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

router.post("/", createLoan);

router.get("/", cacheMiddleware(15000), getLoans);

router.get("/:id", cacheMiddleware(15000), getLoanById);

router.put("/:id", updateLoan);
router.delete("/:id", deleteLoan);
router.put("/:id/status", cancelLoan);

router.post("/:loanId/payments", addPayment);

router.get("/:loanId/payments", cacheMiddleware(10000), getPayments);

router.put("/:loanId/payments/:paymentId", editPayment);

module.exports = router;
