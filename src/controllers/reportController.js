const Member = require("../models/Member");
const Loan = require("../models/Loan");
const Payment = require("../models/Payment");

const getReports = async (req, res) => {
  try {
    const [
      totalMembers,
      activeLoans,
      completedLoans,
      loanSummary,
      paymentSummary,
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

      Payment.aggregate([
        {
          $group: {
            _id: null,
            totalCollections: {
              $sum: "$amount",
            },
          },
        },
      ]),
    ]);

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

        totalOutstanding:
          loanSummary[0]?.totalOutstanding || 0,

        totalCollections:
          paymentSummary[0]?.totalCollections || 0,
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
