const Expense = require("../models/Expense");

const addExpense = async (req, res) => {
  try {
    const { title, amount } = req.body;

    if (!title || !amount) {
      return res.status(400).json({
        success: false,
        message: "Title and amount are required",
      });
    }

    const expense = await Expense.create({
      title,
      amount: Number(amount),
      expenseDate: Date.now(),
      createdBy: req.admin._id,
    });

    res.status(201).json({
      success: true,
      expense,
      message: "Expense added successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const getExpenses = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const search = req.query.search || '';

    const filter = {};
    if (search) {
      filter.title = { $regex: search, $options: 'i' };
    }

    const skip = (page - 1) * limit;

    const [expenses, totalRecords, totalAggregation, dateAggregation] = await Promise.all([
      Expense.find(filter).sort({ expenseDate: -1 }).skip(skip).limit(limit).lean(),
      Expense.countDocuments(filter),
      Expense.aggregate([
        { $match: filter },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),
      Expense.aggregate([
        { $match: filter },
        { 
          $group: { 
            _id: { $dateToString: { format: "%d/%m/%Y", date: "$expenseDate", timezone: "Asia/Kolkata" } }, 
            total: { $sum: '$amount' } 
          } 
        }
      ])
    ]);

    const totalPages = Math.ceil(totalRecords / limit);
    const totalExpenses = totalAggregation.length > 0 ? totalAggregation[0].total : 0;
    
    const dateSubtotals = {};
    dateAggregation.forEach(item => {
      if (item._id) dateSubtotals[item._id] = item.total;
    });

    res.json({
      success: true,
      data: expenses,
      totalExpenses,
      dateSubtotals,
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
  addExpense,
  getExpenses,
};
