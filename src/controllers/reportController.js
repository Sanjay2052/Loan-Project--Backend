const Member = require("../models/Member");
const Loan = require("../models/Loan");
const Saving = require("../models/Saving");
const User = require("../models/User");

const getReports = async (req, res) => {
  try {
    const [
      totalMembers,
      activeLoans,
      completedLoans,
      loanSummary,
      savingsSummary,
      usersSummary,
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
    ]);

    const totalSavings = (savingsSummary[0]?.total || 0) + (usersSummary[0]?.total || 0);
    const totalOutstanding = loanSummary[0]?.totalOutstanding || 0;
    const overallBalance = totalOutstanding + totalSavings;

    res.json({
      success: true,

      reports: {
        totalMembers,

        activeLoans,

        completedLoans,

        totalLoanAmount:
          loanSummary[0]?.totalLoanAmount || 0,

        totalPaid:
          loanSummary[0]?.totalPaid || 0,

        totalOutstanding,

        totalSavings,

        overallBalance,
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
