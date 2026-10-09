const Income = require("../models/Income");

const addIncome = async (req, res) => {
  try {
    const { incomeName, amount } = req.body;

    if (!incomeName || !amount) {
      return res.status(400).json({
        success: false,
        message: "Income name and amount are required",
      });
    }

    const income = await Income.create({
      incomeName,
      amount: Number(amount),
      incomeDate: Date.now(),
      createdBy: req.admin._id,
    });

    res.status(201).json({
      success: true,
      income,
      message: "Income added successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const getIncome = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const search = req.query.search || '';

    const filter = {};
    if (search) {
      filter.incomeName = { $regex: search, $options: 'i' };
    }

    const skip = (page - 1) * limit;

    const [incomeRecords, totalRecords, totalAggregation] = await Promise.all([
      Income.find(filter).sort({ incomeDate: -1 }).skip(skip).limit(limit).lean(),
      Income.countDocuments(filter),
      Income.aggregate([
        { $match: filter },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ])
    ]);

    const totalPages = Math.ceil(totalRecords / limit);
    const totalIncome = totalAggregation.length > 0 ? totalAggregation[0].total : 0;

    res.json({
      success: true,
      data: incomeRecords,
      totalIncome,
      pagination: {
        page,
        limit,
        totalRecords,
        totalPages,
        hasNextPage: page < totalPages
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  addIncome,
  getIncome,
};
