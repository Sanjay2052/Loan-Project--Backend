const CommitteeMember = require("../models/CommitteeMember");
const { clearCacheByPrefix } = require("../middleware/cacheMiddleware");

// Create committee member
const createCommitteeMember = async (req, res) => {
  try {
    const { name, phoneNumber } = req.body;

    if (!name || !phoneNumber) {
      return res.status(400).json({
        success: false,
        message: "Name and phone number are required",
      });
    }

    const member = await CommitteeMember.create({ name, phoneNumber });

    res.status(201).json({
      success: true,
      message: "Committee Member created successfully",
      data: member,
    });

    clearCacheByPrefix('/api/committee-members');
    clearCacheByPrefix('/api/loans');
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// Get all committee members
const getCommitteeMembers = async (req, res) => {
  try {
    const members = await CommitteeMember.find().sort({ createdAt: -1 }).lean();
    const Loan = require("../models/Loan");
    const Saving = require("../models/Saving");

    const memberIds = members.map(m => m._id);

    const loanTotals = await Loan.aggregate([
      { $match: { committeeMember: { $in: memberIds } } },
      { $group: { _id: "$committeeMember", totalLoanAmount: { $sum: "$loanAmount" } } }
    ]);
    const loanMap = {};
    loanTotals.forEach(l => { loanMap[l._id.toString()] = l.totalLoanAmount; });

    const savingTotals = await Saving.aggregate([
      { $match: { committeeMember: { $in: memberIds } } },
      { $group: { _id: "$committeeMember", totalSavingsAmount: { $sum: "$amount" } } }
    ]);
    const savingMap = {};
    savingTotals.forEach(s => { savingMap[s._id.toString()] = s.totalSavingsAmount; });

    const enhancedMembers = members.map(member => {
      const mId = member._id.toString();
      return {
        ...member,
        totalLoanAmount: loanMap[mId] || 0,
        totalSavingsAmount: savingMap[mId] || 0,
      };
    });
    res.json({
      success: true,
      count: enhancedMembers.length,
      data: enhancedMembers,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// Get a single committee member
const getCommitteeMemberById = async (req, res) => {
  try {
    const member = await CommitteeMember.findById(req.params.id).lean();

    if (!member) {
      return res.status(404).json({
        success: false,
        message: "Committee Member not found",
      });
    }

    const Loan = require("../models/Loan");
    const Saving = require("../models/Saving");

    const loans = await Loan.find({ committeeMember: member._id })
      .populate('member', 'name')
      .select('member loanAmount')
      .lean();

    const savings = await Saving.find({ committeeMember: member._id })
      .populate('user', 'name')
      .select('user amount')
      .lean();

    const totalLoanAmount = loans.reduce((sum, l) => sum + (l.loanAmount || 0), 0);
    const totalSavingsAmount = savings.reduce((sum, s) => sum + (s.amount || 0), 0);

    const formattedLoans = loans.map(l => ({
      _id: l._id,
      name: l.member ? l.member.name : 'Unknown',
      amount: l.loanAmount
    }));

    const formattedSavings = savings.map(s => ({
      _id: s._id,
      name: s.user ? s.user.name : 'Unknown',
      amount: s.amount
    }));

    res.json({
      success: true,
      data: {
        ...member,
        totalLoanAmount,
        totalSavingsAmount,
        loans: formattedLoans,
        savings: formattedSavings
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// Update committee member
const updateCommitteeMember = async (req, res) => {
  try {
    const member = await CommitteeMember.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!member) {
      return res.status(404).json({
        success: false,
        message: "Committee Member not found",
      });
    }

    res.json({
      success: true,
      message: "Committee Member updated successfully",
      data: member,
    });

    clearCacheByPrefix('/api/committee-members');
    clearCacheByPrefix('/api/loans');
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// Delete committee member
const deleteCommitteeMember = async (req, res) => {
  try {
    const Loan = require("../models/Loan");
    const activeLoans = await Loan.countDocuments({
      committeeMember: req.params.id,
      status: "active",
    });

    if (activeLoans > 0) {
      return res.status(400).json({
        success: false,
        message: "Cannot delete committee member with active loans",
      });
    }

    const member = await CommitteeMember.findByIdAndDelete(req.params.id);

    if (!member) {
      return res.status(404).json({
        success: false,
        message: "Committee Member not found",
      });
    }

    res.json({
      success: true,
      message: "Committee Member deleted successfully",
    });

    clearCacheByPrefix('/api/committee-members');
    clearCacheByPrefix('/api/loans');
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

module.exports = {
  createCommitteeMember,
  getCommitteeMembers,
  getCommitteeMemberById,
  updateCommitteeMember,
  deleteCommitteeMember,
};
