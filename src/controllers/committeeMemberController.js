const CommitteeMember = require("../models/CommitteeMember");

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
    const members = await CommitteeMember.find().sort({ createdAt: -1 });
    res.json({
      success: true,
      count: members.length,
      data: members,
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
    const member = await CommitteeMember.findById(req.params.id);

    if (!member) {
      return res.status(404).json({
        success: false,
        message: "Committee Member not found",
      });
    }

    res.json({
      success: true,
      data: member,
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
