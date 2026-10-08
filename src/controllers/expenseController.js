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
    const expenses = await Expense.find().sort({ expenseDate: -1 }).lean();
    
    res.json({
      success: true,
      expenses,
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
