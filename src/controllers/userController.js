const User = require("../models/User");
const { clearCacheByPrefix } = require("../middleware/cacheMiddleware");

// Create user
const createUser = async (req, res) => {
  try {
    let { name, phoneNumber, place, isSavingUser, initialSavingsAmount } = req.body;

    if (!name || !phoneNumber || !place) {
      return res.status(400).json({
        success: false,
        message: "Name, phone number, and place are required",
      });
    }

    if (isSavingUser) {
      if (!initialSavingsAmount || initialSavingsAmount <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Savings amount is required for a saving user'
        });
      }
    } else {
      initialSavingsAmount = 0;
    }

    const user = await User.create({ name, phoneNumber, place, isSavingUser, initialSavingsAmount });

    res.status(201).json({
      success: true,
      message: "User created successfully",
      data: user,
    });

    clearCacheByPrefix('/api/users');
    clearCacheByPrefix('/api/reports');
    clearCacheByPrefix('/api/savings');
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// Get all users
const getUsers = async (req, res) => {
  try {
    const users = await User.find().sort({ createdAt: -1 });
    res.json({
      success: true,
      count: users.length,
      data: users,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// Get a single user by ID
const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// Update a user
const updateUser = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { ...req.body, initialSavingsAmount: req.body.isSavingUser ? req.body.initialSavingsAmount : 0 },
      { new: true, runValidators: true }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.json({
      success: true,
      message: "User updated successfully",
      data: user,
    });

    clearCacheByPrefix('/api/users');
    clearCacheByPrefix('/api/reports');
    clearCacheByPrefix('/api/savings');
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// Delete a user
const deleteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.json({
      success: true,
      message: "User deleted successfully",
    });

    clearCacheByPrefix('/api/users');
    clearCacheByPrefix('/api/reports');
    clearCacheByPrefix('/api/savings');
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// Get loans by user
const getLoansByUser = async (req, res) => {
  try {
    const Loan = require("../models/Loan");
    const Member = require("../models/Member");

    const user = await User.findById(req.params.id).lean();

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    let memberId = user.member;

    if (!memberId) {
      let member = await Member.findOne({ phone: user.phoneNumber }).lean();
      if (!member) {
        member = await Member.findOne({ name: user.name }).lean();
      }

      if (member) {
        memberId = member._id;
        await User.findByIdAndUpdate(user._id, { member: memberId });
        // Also update member phone if missing
        if (!member.phone && user.phoneNumber) {
          await Member.findByIdAndUpdate(memberId, { phone: user.phoneNumber });
        }
      }
    }

    if (!memberId) {
      return res.json({
        success: true,
        count: 0,
        loans: [],
      });
    }

    const loans = await Loan.find({ member: memberId })
      .select('loanNumber member loanAmount totalPaid remainingAmount status paymentFrequency startDate')
      .populate('member', 'memberId name phone address')
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
      message: "Server error",
      error: error.message,
    });
  }
};

module.exports = {
  createUser,
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
  getLoansByUser,
};
