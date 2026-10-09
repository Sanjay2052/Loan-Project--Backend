const User = require('../models/User');
const Saving = require('../models/Saving');
const { clearCacheByPrefix } = require('../middleware/cacheMiddleware');

const getSavingUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const search = req.query.search || '';

    const filter = { isSavingUser: true };
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { phoneNumber: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (page - 1) * limit;

    const [users, totalRecords] = await Promise.all([
      User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      User.countDocuments(filter)
    ]);
    
    const userIds = users.map(u => u._id);
    const collections = await Saving.aggregate([
      { $match: { user: { $in: userIds } } },
      { $group: { _id: '$user', totalCollections: { $sum: '$amount' } } }
    ]);

    const collectionsMap = {};
    collections.forEach(c => {
      collectionsMap[c._id.toString()] = c.totalCollections;
    });

    const savings = users.map(user => {
      const collected = collectionsMap[user._id.toString()] || 0;
      return {
        _id: user._id,
        name: user.name,
        initialSavings: user.initialSavingsAmount || 0,
        collections: collected,
        totalSavings: collected
      };
    });

    const totalPages = Math.ceil(totalRecords / limit);

    res.json({
      success: true,
      data: savings,
      pagination: {
        page,
        limit,
        totalRecords,
        totalPages,
        hasNextPage: page < totalPages
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getSavingsHistory = async (req, res) => {
  try {
    const userId = req.params.userId;
    const user = await User.findById(userId).lean();
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const history = await Saving.find({ user: userId })
      .populate('committeeMember', 'name phoneNumber')
      .populate('collectedBy', 'name email')
      .sort({ savingDate: 1, createdAt: 1 })
      .lean();

    const collectionsTotal = history.reduce((sum, h) => sum + (h.amount || 0), 0);

    res.json({
      success: true,
      user: {
        _id: user._id,
        name: user.name,
        initialSavings: user.initialSavingsAmount || 0,
        totalSavings: collectionsTotal
      },
      history
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const addSaving = async (req, res) => {
  try {
    const { amount, committeeMember } = req.body;
    const userId = req.params.userId;

    const paymentAmount = Number(amount);
    if (Number.isNaN(paymentAmount) || paymentAmount < 0) {
      return res.status(400).json({ success: false, message: "Valid payment amount is required" });
    }

    const saving = await Saving.create({
      user: userId,
      amount: paymentAmount,
      committeeMember,
      collectedBy: req.admin._id
    });

    clearCacheByPrefix('/api/savings');
    clearCacheByPrefix('/api/users');
    res.status(201).json({ success: true, message: 'Saving added successfully', saving });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const editSaving = async (req, res) => {
  try {
    const { amount, committeeMember } = req.body;
    const { savingId } = req.params;

    const saving = await Saving.findById(savingId);
    if (!saving) {
      return res.status(404).json({ success: false, message: 'Saving not found' });
    }

    const paymentAmount = Number(amount);
    if (Number.isNaN(paymentAmount) || paymentAmount < 0) {
      return res.status(400).json({ success: false, message: "Valid payment amount is required" });
    }

    saving.amount = paymentAmount;
    if (committeeMember) {
      saving.committeeMember = committeeMember;
    }

    await saving.save();

    clearCacheByPrefix('/api/savings');
    clearCacheByPrefix('/api/users');
    res.json({ success: true, message: 'Saving updated successfully', saving });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const deleteSaving = async (req, res) => {
  try {
    const { savingId } = req.params;
    await Saving.findByIdAndDelete(savingId);
    clearCacheByPrefix('/api/savings');
    clearCacheByPrefix('/api/users');
    res.json({ success: true, message: 'Saving deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getSavingUsers,
  getSavingsHistory,
  addSaving,
  editSaving,
  deleteSaving,
};
