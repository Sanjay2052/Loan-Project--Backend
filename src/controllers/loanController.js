const Loan = require("../models/Loan");
const Member = require("../models/Member");

const createLoan = async (req, res) => {
  try {
    const {
      name,
      committeeMember,
      startDate,
      loanAmount,
      paymentFrequency,
    } = req.body;

    // Validation
    if (!name || !startDate || !loanAmount) {
      return res.status(400).json({
        success: false,
        message: "User name, start date and loan amount are required",
      });
    }

    const amount = Number(loanAmount);

    if (amount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Loan amount must be greater than zero",
      });
    }

    // Find existing member by name
    let member = await Member.findOne({ name });

    // Create member if not exists
    if (!member) {
      member = await Member.create({
        memberId: `MEM-${Date.now()}`,
        name,
        committeeMember,
        status: "active",
      });
    }

    // Generate loan number
    const loanNumber = `LOAN-${Date.now()}`;

    // Create loan
    const loan = await Loan.create({
      member: member._id,
      loanNumber,
      loanAmount: amount,
      totalPaid: 0,
      remainingAmount: amount,
      paymentFrequency: paymentFrequency || "weekly",
      startDate,
      status: "active",
      createdBy: req.admin._id,
    });

    const populatedLoan = await Loan.findById(loan._id)
      .populate("member", "memberId name")
      .populate("createdBy", "name email");

    return res.status(201).json({
      success: true,
      message: "Loan created successfully",
      loan: populatedLoan,
    });

  } catch (error) {
    console.error("Create loan error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error",
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
