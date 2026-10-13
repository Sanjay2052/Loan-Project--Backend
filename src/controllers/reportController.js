const Member = require("../models/Member");
const Loan = require("../models/Loan");
const Saving = require("../models/Saving");
const Payment = require("../models/Payment");
const Expense = require("../models/Expense");
const Income = require("../models/Income");

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Returns { start, end } as UTC Date objects for the IST day containing
 * the given date (or today if omitted).
 */
function istDayBounds(date = new Date()) {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = fmt.formatToParts(date);
  const y = parts.find((p) => p.type === "year").value;
  const m = parts.find((p) => p.type === "month").value;
  const d = parts.find((p) => p.type === "day").value;

  return {
    start: new Date(`${y}-${m}-${d}T00:00:00.000+05:30`),
    end:   new Date(`${y}-${m}-${d}T23:59:59.999+05:30`),
  };
}

// ─── Controller ─────────────────────────────────────────────────────────────

const getReports = async (req, res) => {
  try {
    // ── 1. Summary counts & loan totals ──────────────────────────────────
    const [
      totalMembers,
      activeLoans,
      completedLoans,
      loanSummary,
      savingsSummary,
    ] = await Promise.all([
      Member.countDocuments(),
      Loan.countDocuments({ status: "active" }),
      Loan.countDocuments({ status: "completed" }),
      Loan.aggregate([
        {
          $group: {
            _id: null,
            totalLoanAmount:  { $sum: "$requestedAmount" },
            totalPaid:        { $sum: "$totalPaid" },
            totalOutstanding: { $sum: "$remainingAmount" },
          },
        },
      ]),
      Saving.aggregate([
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
    ]);

    const loanTotalAmount     = loanSummary[0]?.totalLoanAmount  || 0;
    const loanTotalPaid       = loanSummary[0]?.totalPaid        || 0;
    const loanTotalOutstanding = loanSummary[0]?.totalOutstanding || 0;
    const savingsCollected    = savingsSummary[0]?.total         || 0;

    // ── 2. Find the latest date with any activity ─────────────────────────
    const [latestPayment, latestSaving, latestIncome, latestExpense, latestLoan] =
      await Promise.all([
        Payment.findOne({}).sort({ paymentDate: -1 }).select("paymentDate").lean(),
        Saving.findOne({}).sort({ savingDate: -1 }).select("savingDate").lean(),
        Income.findOne({}).sort({ incomeDate: -1 }).select("incomeDate").lean(),
        Expense.findOne({}).sort({ expenseDate: -1 }).select("expenseDate").lean(),
        Loan.findOne({}).sort({ createdAt: -1 }).select("createdAt").lean(),
      ]);

    const candidateDates = [
      latestPayment?.paymentDate,
      latestSaving?.savingDate,
      latestIncome?.incomeDate,
      latestExpense?.expenseDate,
      latestLoan?.createdAt,
    ]
      .filter(Boolean)
      .map((d) => new Date(d));

    let availableBalance = 0;

    if (candidateDates.length > 0) {
      const latestDate = new Date(Math.max(...candidateDates.map((d) => d.getTime())));
      const { start, end } = istDayBounds(latestDate);

      // ── 3. Two $facet pipelines — "before" and "on" the latest date ─────
      // Run Payment, Saving, Expense, Income in one round-trip each using $facet
      const [payFacet, savFacet, incFacet, expFacet, loanFacet] =
        await Promise.all([
          Payment.aggregate([
            {
              $facet: {
                before: [
                  { $match: { paymentDate: { $lt: start } } },
                  { $group: { _id: null, total: { $sum: "$amount" } } },
                ],
                today: [
                  { $match: { paymentDate: { $gte: start, $lte: end } } },
                  { $group: { _id: null, total: { $sum: "$amount" } } },
                ],
              },
            },
          ]),
          Saving.aggregate([
            {
              $facet: {
                before: [
                  { $match: { savingDate: { $lt: start } } },
                  { $group: { _id: null, total: { $sum: "$amount" } } },
                ],
                today: [
                  { $match: { savingDate: { $gte: start, $lte: end } } },
                  { $group: { _id: null, total: { $sum: "$amount" } } },
                ],
              },
            },
          ]),
          Income.aggregate([
            {
              $facet: {
                before: [
                  { $match: { incomeDate: { $lt: start } } },
                  { $group: { _id: null, total: { $sum: "$amount" } } },
                ],
                today: [
                  { $match: { incomeDate: { $gte: start, $lte: end } } },
                  { $group: { _id: null, total: { $sum: "$amount" } } },
                ],
              },
            },
          ]),
          Expense.aggregate([
            {
              $facet: {
                before: [
                  { $match: { expenseDate: { $lt: start } } },
                  { $group: { _id: null, total: { $sum: "$amount" } } },
                ],
                today: [
                  { $match: { expenseDate: { $gte: start, $lte: end } } },
                  { $group: { _id: null, total: { $sum: "$amount" } } },
                ],
              },
            },
          ]),
          Loan.aggregate([
            {
              $facet: {
                before: [
                  { $match: { createdAt: { $lt: start } } },
                  { $group: { _id: "$loanType", total: { $sum: "$requestedAmount" } } },
                ],
                today: [
                  { $match: { createdAt: { $gte: start, $lte: end } } },
                  { $group: { _id: "$loanType", total: { $sum: "$requestedAmount" } } },
                ],
              },
            },
          ]),
        ]);

      // ── Extract facet values ─────────────────────────────────────────────
      const pastPayTotal  = payFacet[0]?.before[0]?.total  || 0;
      const todayPayTotal = payFacet[0]?.today[0]?.total   || 0;

      const pastSavTotal  = savFacet[0]?.before[0]?.total  || 0;
      const todaySavTotal = savFacet[0]?.today[0]?.total   || 0;

      const pastIncTotal  = incFacet[0]?.before[0]?.total  || 0;
      const todayIncTotal = incFacet[0]?.today[0]?.total   || 0;

      const pastExpTotal  = expFacet[0]?.before[0]?.total  || 0;
      const todayExpTotal = expFacet[0]?.today[0]?.total   || 0;

      const calcLoanGiven = (rows) =>
        (rows || []).reduce(
          (sum, r) => sum + (r._id === "weekly" ? r.total * 0.9 : r.total),
          0
        );
      const pastLoanGiven  = calcLoanGiven(loanFacet[0]?.before);
      const todayLoanGiven = calcLoanGiven(loanFacet[0]?.today);

      // ── Balance calculation ──────────────────────────────────────────────
      const cashInPast = pastPayTotal + pastSavTotal + pastIncTotal;
      const oldBalance = cashInPast - pastLoanGiven - pastExpTotal;

      const totalInflows             = todayPayTotal + todaySavTotal;
      const balanceBeforeOutgoing    = oldBalance + totalInflows + todayIncTotal;
      availableBalance               = balanceBeforeOutgoing - todayLoanGiven - todayExpTotal;
    }

    const total            = loanTotalOutstanding + availableBalance;
    const profitOrBalances = total - savingsCollected;

    res.json({
      success: true,
      reports: {
        totalMembers,
        activeLoans,
        completedLoans,
        totalLoanAmount:  loanTotalAmount,
        totalPaid:        loanTotalPaid,
        totalOutstanding: loanTotalOutstanding,
        totalSavings:     savingsCollected,
        availableBalance,
        total,
        profitOrBalances,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getReports };
