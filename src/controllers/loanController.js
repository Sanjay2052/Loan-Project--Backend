const Loan = require("../models/Loan");
const Member = require("../models/Member");

const createLoan = async (req, res) => {
  try {
    const {
      memberId,
      loanNumber,
      loanAmount,
      expectedPayment,
      paymentFrequency,
      startDate,
      notes,
    } = req.body;

    if (
      !memberId ||
      !loanNumber ||
      !loanAmount ||
      !startDate
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Member, loan number, loan amount and start date are required",
      });
    }

    const member = await Member.findById(memberId);

    if (!member) {
      return res.status(404).json({
        success: false,
        message: "Member not found",
      });
    }

    const existingLoan = await Loan.findOne({
      loanNumber,
    });

    if (existingLoan) {
      return res.status(409).json({
        success: false,
        message: "Loan number already exists",
      });
    }

    const amount = Number(loanAmount);

    if (amount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Loan amount must be greater than zero",
      });
    }

    const loan = await Loan.create({
      member: member._id,
      loanNumber,
      loanAmount: amount,
      totalPaid: 0,
      remainingAmount: amount,
      expectedPayment: Number(expectedPayment || 0),
      paymentFrequency: paymentFrequency || "weekly",
      startDate,
      status: "active",
      notes,
      createdBy: req.admin._id,
    });

    const populatedLoan = await Loan.findById(loan._id)
      .populate("member", "memberId name phone")
      .populate("createdBy", "name email");

    res.status(201).json({
      success: true,
      message: "Loan created successfully",
      loan: populatedLoan,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const getLoans = async (req, res) => {
  try {
    const loans = await Loan.find()
      .populate("member", "memberId name phone")
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: loans.length,
      loans,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const getLoanById = async (req, res) => {
  try {
    const loan = await Loan.findById(req.params.id)
      .populate("member", "memberId name phone address")
      .populate("createdBy", "name email");

    if (!loan) {
      return res.status(404).json({
        success: false,
        message: "Loan not found",
      });
    }

    res.json({
      success: true,
      loan,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  createLoan,
  getLoans,
  getLoanById,
};
