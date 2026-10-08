const Loan = require("../models/Loan");
const Member = require("../models/Member");
const Payment = require("../models/Payment");
const { clearCacheByPrefix } = require("../middleware/cacheMiddleware");

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
      committeeMember: committeeMember,
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

    res.status(201).json({
      success: true,
      message: "Loan created successfully",
      loan: populatedLoan,
    });

    clearCacheByPrefix('/api/loans');
    clearCacheByPrefix('/api/reports');

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
      .select('loanNumber member committeeMember loanAmount totalPaid remainingAmount status paymentFrequency startDate')
      .populate("member", "memberId name phone")
      .populate("committeeMember", "name phoneNumber")
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 })
      .lean();

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
      .lean();

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

const addPayment = async (req, res) => {
  try {
    const loan = await Loan.findById(req.params.loanId);
    if (!loan) {
      return res.status(404).json({ success: false, message: "Loan not found" });
    }

    const { amount, committeeMember } = req.body;
    const paymentAmount = Number(amount);

    if (amount === undefined || amount === null || Number.isNaN(paymentAmount) || paymentAmount < 0) {
      return res.status(400).json({ success: false, message: "Valid payment amount is required" });
    }

    if (paymentAmount > loan.remainingAmount) {
      return res.status(400).json({ success: false, message: "Collection cannot exceed remaining amount" });
    }

    const payment = await Payment.create({
      loan: loan._id,
      amount: paymentAmount,
      committeeMember,
      collectedBy: req.admin._id
    });

    loan.totalPaid += paymentAmount;
    loan.remainingAmount -= paymentAmount;
    
    if (loan.remainingAmount <= 0) {
      loan.status = "completed";
    }

    await loan.save();

    res.status(201).json({
      success: true,
      message: "Payment added successfully",
      payment
    });

    clearCacheByPrefix('/api/loans');
    clearCacheByPrefix('/api/reports');
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getPayments = async (req, res) => {
  try {
    const loan = await Loan.findById(req.params.loanId);
    if (!loan) {
      return res.status(404).json({ success: false, message: "Loan not found" });
    }

    const payments = await Payment.find({ loan: req.params.loanId })
      .populate("collectedBy", "name email")
      .populate("committeeMember", "name phoneNumber")
      .sort({ paymentDate: 1, createdAt: 1 });

    let balance = loan.loanAmount;
    const history = payments.map((payment) => {
      balance -= Number(payment.amount || 0);
      return {
        ...payment.toObject(),
        remainingBalance: balance,
      };
    });

    res.json({
      success: true,
      payments: history
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getLoansByMember = async (req, res) => {
  try {
    const loans = await Loan.find({ member: req.params.id })
      .select('loanNumber loanAmount totalPaid remainingAmount status startDate')
      .populate("member", "memberId name phone address")
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      success: true,
      count: loans.length,
      loans
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getLoansByCommitteeMember = async (req, res) => {
  try {
    const loans = await Loan.find({ committeeMember: req.params.id })
      .select('loanNumber member loanAmount totalPaid remainingAmount status')
      .populate("member", "memberId name phone address")
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      success: true,
      count: loans.length,
      loans
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const editPayment = async (req, res) => {
  const mongoose = require("mongoose");
  const session = await mongoose.startSession();

  try {
    await session.withTransaction(async () => {
      const { amount, committeeMember } = req.body;
      const paymentId = req.params.paymentId;
      const loanId = req.params.loanId;

      const payment = await Payment.findOne({
        _id: paymentId,
        loan: loanId
      }).session(session);

      if (!payment) {
        throw new Error('Payment not found');
      }

      const loan = await Loan.findById(loanId).session(session);

      if (!loan) {
        throw new Error('Loan not found');
      }

      const paymentAmount = Number(amount);
      if (Number.isNaN(paymentAmount) || paymentAmount < 0) {
        throw new Error("Valid payment amount is required");
      }

      payment.amount = paymentAmount;

      if (committeeMember) {
        payment.committeeMember = committeeMember;
      }

      await payment.save({ session });

      const result = await Payment.aggregate([
        {
          $match: {
            loan: loan._id
          }
        },
        {
          $group: {
            _id: null,
            totalPaid: {
              $sum: '$amount'
            }
          }
        }
      ]).session(session);

      const totalPaid = result.length > 0 ? result[0].totalPaid : 0;

      loan.totalPaid = totalPaid;

      loan.remainingAmount = Math.max(0, loan.loanAmount - totalPaid);

      loan.status = loan.remainingAmount === 0 ? 'completed' : 'active';

      await loan.save({ session });
    });

    res.json({
      success: true,
      message: 'Collection updated successfully'
    });
    
    clearCacheByPrefix('/api/loans');
    clearCacheByPrefix('/api/reports');
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  } finally {
    await session.endSession();
  }
};

const updateLoan = async (req, res) => {
  try {
    const loan = await Loan.findById(req.params.id);
    if (!loan) return res.status(404).json({ success: false, message: "Loan not found" });

    const { loanAmount, paymentFrequency, startDate, committeeMember } = req.body;
    
    const newAmount = Number(loanAmount);
    if (newAmount < loan.totalPaid) {
      return res.status(400).json({ success: false, message: "Loan amount cannot be less than total paid amount" });
    }

    loan.loanAmount = newAmount;
    if (paymentFrequency) loan.paymentFrequency = paymentFrequency;
    if (startDate) loan.startDate = startDate;
    if (committeeMember) loan.committeeMember = committeeMember;

    loan.remainingAmount = Math.max(0, loan.loanAmount - loan.totalPaid);
    loan.status = loan.remainingAmount === 0 ? 'completed' : 'active';
    await loan.save();

    res.json({ success: true, message: 'Loan updated successfully', loan });
    clearCacheByPrefix('/api/loans');
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const deleteLoan = async (req, res) => {
  try {
    const loan = await Loan.findById(req.params.id);
    if (!loan) return res.status(404).json({ success: false, message: "Loan not found" });

    if (loan.totalPaid > 0) {
      return res.status(400).json({ success: false, message: "Cannot delete loan because collections already exist. You can cancel the loan instead." });
    }

    await Loan.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Loan deleted successfully' });
    clearCacheByPrefix('/api/loans');
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const cancelLoan = async (req, res) => {
  try {
    const loan = await Loan.findById(req.params.id);
    if (!loan) return res.status(404).json({ success: false, message: "Loan not found" });
    
    if (req.body.status === 'cancelled') {
      loan.status = 'cancelled';
      await loan.save();
      res.json({ success: true, message: 'Loan cancelled successfully' });
      clearCacheByPrefix('/api/loans');
    } else {
      res.status(400).json({ success: false, message: "Invalid status update" });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  createLoan,
  getLoans,
  getLoanById,
  updateLoan,
  deleteLoan,
  cancelLoan,
  addPayment,
  getPayments,
  editPayment,
  getLoansByMember,
  getLoansByCommitteeMember
};
