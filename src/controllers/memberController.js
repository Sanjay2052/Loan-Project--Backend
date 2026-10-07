const Member = require("../models/Member");
const { clearCacheByPrefix } = require("../middleware/cacheMiddleware");

// Create member
const createMember = async (req, res) => {
  try {
    const { name, phone, address, status, committeeMember } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Name is required",
      });
    }

    const member = await Member.create({
      memberId: `MEM-${Date.now()}`,
      name,
      phone,
      address,
      status: status || "active",
      committeeMember,
    });

    res.status(201).json({
      success: true,
      message: "Member created successfully",
      data: member,
    });

    clearCacheByPrefix('/api/members');
    clearCacheByPrefix('/api/loans');
    clearCacheByPrefix('/api/reports');
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// Get all members
const getMembers = async (req, res) => {
  try {
    const members = await Member.find().sort({ createdAt: -1 });
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

// Get a single member by ID
const getMemberById = async (req, res) => {
  try {
    const member = await Member.findById(req.params.id);

    if (!member) {
      return res.status(404).json({
        success: false,
        message: "Member not found",
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

// Update a member
const updateMember = async (req, res) => {
  try {
    const member = await Member.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!member) {
      return res.status(404).json({
        success: false,
        message: "Member not found",
      });
    }

    res.json({
      success: true,
      message: "Member updated successfully",
      data: member,
    });

    clearCacheByPrefix('/api/members');
    clearCacheByPrefix('/api/loans');
    clearCacheByPrefix('/api/reports');
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// Delete a member
const deleteMember = async (req, res) => {
  try {
    const member = await Member.findByIdAndDelete(req.params.id);

    if (!member) {
      return res.status(404).json({
        success: false,
        message: "Member not found",
      });
    }

    res.json({
      success: true,
      message: "Member deleted successfully",
    });

    clearCacheByPrefix('/api/members');
    clearCacheByPrefix('/api/loans');
    clearCacheByPrefix('/api/reports');
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

module.exports = {
  createMember,
  getMembers,
  getMemberById,
  updateMember,
  deleteMember,
};
