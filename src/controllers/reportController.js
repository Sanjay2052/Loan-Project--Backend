const Member = require("../models/Member");
const Loan = require("../models/Loan");
const Saving = require("../models/Saving");
const User = require("../models/User");
const Payment = require("../models/Payment");
const Expense = require("../models/Expense");
const Income = require("../models/Income");

const getReports = async (req, res) => {
  try {
    const [
      totalMembers,
      activeLoans,
      completedLoans,
      loanSummary,
      savingsSummary,
      usersSummary,
      totalPayments,
      totalExpenses,
      totalIncome,
    ] = await Promise.all([
      Member.countDocuments(),

      Loan.countDocuments({ status: "active" }),

      Loan.countDocuments({ status: "completed" }),

      Loan.aggregate([
        {
          $group: {
            _id: null,
            totalLoanAmount: { $sum: "$requestedAmount" },
            totalPaid: { $sum: "$totalPaid" },
            totalOutstanding: { $sum: "$remainingAmount" },
          },
        },
      ]),

      Saving.aggregate([
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),

      User.aggregate([
        { $group: { _id: null, total: { $sum: "$initialSavingsAmount" } } },
      ]),

      Payment.aggregate([{ $group: { _id: null, total: { $sum: "$amount" } } }]),
      Expense.aggregate([{ $group: { _id: null, total: { $sum: "$amount" } } }]),
      Income.aggregate([{ $group: { _id: null, total: { $sum: "$amount" } } }]),
    ]);

    const loanTotalPaid = loanSummary[0]?.totalPaid || 0;
    const loanTotalOutstanding = loanSummary[0]?.totalOutstanding || 0;
    const loanTotalAmount = loanSummary[0]?.totalLoanAmount || 0;
    const savingsCollected = savingsSummary[0]?.total || 0;

    // ---------------------------------------------------------------
    // Find the latest collection date across all transaction types
    // ---------------------------------------------------------------
    const [
      latestPayment,
      latestSaving,
      latestIncome,
      latestExpense,
      latestLoan,
    ] = await Promise.all([
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
      // Pick the maximum date across all sources
      const latestDate = new Date(
        Math.max(...candidateDates.map((d) => d.getTime()))
      );

      // Build IST midnight boundaries for that date
      const formatter = new Intl.DateTimeFormat("en-US", {
        timeZone: "Asia/Kolkata",
        year: "numeric",
        month: "numeric",
        day: "numeric",
      });
      const parts = formatter.formatToParts(latestDate);
      const year  = parts.find((p) => p.type === "year").value;
      const month = parts.find((p) => p.type === "month").value;
      const day   = parts.find((p) => p.type === "day").value;

      const startStr = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}T00:00:00.000+05:30`;
      const endStr   = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}T23:59:59.999+05:30`;
      const start = new Date(startStr);
      const end   = new Date(endStr);

      // --- Old Balance: all transactions BEFORE the latest date (previous days' closing) ---
      const [
        pastPaymentsAgg,
        pastSavingsAgg,
        pastLoansAgg,
        pastExpensesAgg,
        pastIncomeAgg,
      ] = await Promise.all([
        Payment.aggregate([
          { $match: { paymentDate: { $lt: start } } },
          { $group: { _id: null, total: { $sum: "$amount" } } },
        ]),
        Saving.aggregate([
          { $match: { savingDate: { $lt: start } } },
          { $group: { _id: null, total: { $sum: "$amount" } } },
        ]),
        Loan.aggregate([
          { $match: { createdAt: { $lt: start } } },
          { $group: { _id: "$loanType", total: { $sum: "$requestedAmount" } } },
        ]),
        Expense.aggregate([
          { $match: { expenseDate: { $lt: start } } },
          { $group: { _id: null, total: { $sum: "$amount" } } },
        ]),
        Income.aggregate([
          { $match: { incomeDate: { $lt: start } } },
          { $group: { _id: null, total: { $sum: "$amount" } } },
        ]),
      ]);

      const cashInPast =
        (pastPaymentsAgg[0]?.total || 0) +
        (pastSavingsAgg[0]?.total || 0) +
        (pastIncomeAgg[0]?.total || 0);

      let pastLoansTotal = 0;
      pastLoansAgg.forEach((item) => {
        pastLoansTotal +=
          item._id === "weekly" ? item.total * 0.9 : item.total;
      });

      const oldBalance =
        cashInPast - pastLoansTotal - (pastExpensesAgg[0]?.total || 0);

      // --- Latest date's own transactions ---
      const [
        todayPayAgg,
        todaySavAgg,
        todayIncAgg,
        todayExpAgg,
        todayLoanAgg,
      ] = await Promise.all([
        Payment.aggregate([
          { $match: { paymentDate: { $gte: start, $lte: end } } },
          { $group: { _id: null, total: { $sum: "$amount" } } },
        ]),
        Saving.aggregate([
          { $match: { savingDate: { $gte: start, $lte: end } } },
          { $group: { _id: null, total: { $sum: "$amount" } } },
        ]),
        Income.aggregate([
          { $match: { incomeDate: { $gte: start, $lte: end } } },
          { $group: { _id: null, total: { $sum: "$amount" } } },
        ]),
        Expense.aggregate([
          { $match: { expenseDate: { $gte: start, $lte: end } } },
          { $group: { _id: null, total: { $sum: "$amount" } } },
        ]),
        Loan.aggregate([
          { $match: { createdAt: { $gte: start, $lte: end } } },
          { $group: { _id: "$loanType", total: { $sum: "$requestedAmount" } } },
        ]),
      ]);

      const totalInflows =
        (todayPayAgg[0]?.total || 0) + (todaySavAgg[0]?.total || 0);
      const todayIncome  = todayIncAgg[0]?.total || 0;
      const todayExpense = todayExpAgg[0]?.total || 0;

      let todayLoanGiven = 0;
      todayLoanAgg.forEach((item) => {
        todayLoanGiven +=
          item._id === "weekly" ? item.total * 0.9 : item.total;
      });

      const balanceBeforeOutgoing = oldBalance + totalInflows + todayIncome;
      availableBalance = balanceBeforeOutgoing - todayLoanGiven - todayExpense;
    }

    // Total = Loan Outstanding + Available Balance
    const total = loanTotalOutstanding + availableBalance;
    const profitOrBalances = total - savingsCollected;

    res.json({
      success: true,
      reports: {
        totalMembers,
        activeLoans,
        completedLoans,
        totalLoanAmount: loanTotalAmount,
        totalPaid: loanTotalPaid,
        totalOutstanding: loanTotalOutstanding,
        totalSavings: savingsCollected,
        availableBalance,
        total,
        profitOrBalances,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  getReports,
};
