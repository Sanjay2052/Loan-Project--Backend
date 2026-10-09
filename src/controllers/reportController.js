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
      totalIncome
    ] = await Promise.all([
      Member.countDocuments(),

      Loan.countDocuments({
        status: "active",
      }),

      Loan.countDocuments({
        status: "completed",
      }),

      Loan.aggregate([
        {
          $group: {
            _id: null,
            totalLoanAmount: {
              $sum: "$loanAmount",
            },
            totalPaid: {
              $sum: "$totalPaid",
            },
            totalOutstanding: {
              $sum: "$remainingAmount",
            },
          },
        },
      ]),

      Saving.aggregate([
        {
          $group: {
            _id: null,
            total: {
              $sum: "$amount",
            },
          },
        },
      ]),

      User.aggregate([
        {
          $group: {
            _id: null,
            total: {
              $sum: "$initialSavingsAmount",
            },
          },
        },
      ]),

      Payment.aggregate([{ $group: { _id: null, total: { $sum: "$amount" } } }]),
      Expense.aggregate([{ $group: { _id: null, total: { $sum: "$amount" } } }]),
      Income.aggregate([{ $group: { _id: null, total: { $sum: "$amount" } } }]),
    ]);

    const loanTotalPaid = loanSummary[0]?.totalPaid || 0;
    const loanTotalOutstanding = loanSummary[0]?.totalOutstanding || 0;
    const loanTotalAmount = loanSummary[0]?.totalLoanAmount || 0;
    const savingsCollected = savingsSummary[0]?.total || 0;

    const totalIncomeValue = totalIncome[0]?.total || 0;
    const totalPaymentsValue = totalPayments[0]?.total || 0;
    const totalExpensesValue = totalExpenses[0]?.total || 0;

    const lastCollectionBalance = totalPaymentsValue + savingsCollected + totalIncomeValue - loanTotalAmount - totalExpensesValue;
    const total = loanTotalOutstanding + lastCollectionBalance;
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
        lastCollectionBalance,
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
