const Payment = require("../models/Payment");
const CommitteeMember = require("../models/CommitteeMember");

const getTodayCollection = async (req, res) => {
  try {
    const queryDateStr = req.query.date;
    const targetDate = queryDateStr ? new Date(queryDateStr) : new Date();

    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
    });
    const parts = formatter.formatToParts(targetDate);
    const year = parts.find((p) => p.type === 'year').value;
    const month = parts.find((p) => p.type === 'month').value;
    const day = parts.find((p) => p.type === 'day').value;

    const startStr = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T00:00:00.000+05:30`;
    const endStr = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T23:59:59.999+05:30`;

    const start = new Date(startStr);
    const end = new Date(endStr);

    const Saving = require("../models/Saving");
    const Loan = require("../models/Loan");
    const Expense = require("../models/Expense");
    const User = require("../models/User");
    const Income = require("../models/Income");

    // Aggregate Payments (Loans)
    const loanResult = await Payment.aggregate([
      { $match: { paymentDate: { $gte: start, $lte: end } } },
      { $group: { _id: '$committeeMember', todayCollection: { $sum: '$amount' } } }
    ]);

    // Aggregate Savings
    const savingResult = await Saving.aggregate([
      { $match: { savingDate: { $gte: start, $lte: end } } },
      { $group: { _id: '$committeeMember', todayCollection: { $sum: '$amount' } } }
    ]);

    const committeeMemberIds = new Set();
    const loanMap = {};
    const savingMap = {};

    loanResult.forEach(item => {
      if (item._id) {
        committeeMemberIds.add(item._id.toString());
        loanMap[item._id.toString()] = item.todayCollection;
      }
    });

    savingResult.forEach(item => {
      if (item._id) {
        committeeMemberIds.add(item._id.toString());
        savingMap[item._id.toString()] = item.todayCollection;
      }
    });

    const members = await CommitteeMember.find({
      _id: { $in: Array.from(committeeMemberIds) }
    }).lean();

    const committeeMembers = members.map(m => {
      const loanCol = loanMap[m._id.toString()] || 0;
      const savCol = savingMap[m._id.toString()] || 0;
      return {
        committeeMemberId: m._id,
        name: m.name,
        phoneNumber: m.phoneNumber,
        todayLoanCollection: loanCol,
        todaySavingsCollection: savCol,
        todayCollection: loanCol + savCol
      };
    }).sort((a, b) => b.todayCollection - a.todayCollection);

    const totalLoanCollection = committeeMembers.reduce((sum, m) => sum + m.todayLoanCollection, 0);
    const totalSavingsCollection = committeeMembers.reduce((sum, m) => sum + m.todaySavingsCollection, 0);
    
    // Aggregate Today's Income
    const todayIncomeAgg = await Income.aggregate([
      { $match: { incomeDate: { $gte: start, $lte: end } } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const todayIncome = todayIncomeAgg[0]?.total || 0;

    const totalInflows = totalLoanCollection + totalSavingsCollection;

    // Calculate Old Balance
    const pastPayments = await Payment.aggregate([
      { $match: { paymentDate: { $lt: start } } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const pastSavings = await Saving.aggregate([
      { $match: { savingDate: { $lt: start } } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    const pastLoans = await Loan.aggregate([
      { $match: { createdAt: { $lt: start } } },
      { $group: { _id: null, total: { $sum: '$loanAmount' } } }
    ]);
    const pastExpenses = await Expense.aggregate([
      { $match: { expenseDate: { $lt: start } } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const pastIncome = await Income.aggregate([
      { $match: { incomeDate: { $lt: start } } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    const cashInPast = 
      (pastPayments[0]?.total || 0) + 
      (pastSavings[0]?.total || 0) + 
      (pastIncome[0]?.total || 0);

    const cashOutPast = 
      (pastLoans[0]?.total || 0) + 
      (pastExpenses[0]?.total || 0);

    const oldBalance = cashInPast - cashOutPast;

    // Calculate Today's Loan Given & Expenses
    const todayLoans = await Loan.aggregate([
      { $match: { createdAt: { $gte: start, $lte: end } } },
      { $group: { _id: null, total: { $sum: '$loanAmount' } } }
    ]);
    const todayExpenses = await Expense.aggregate([
      { $match: { expenseDate: { $gte: start, $lte: end } } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    const todayLoanGiven = todayLoans[0]?.total || 0;
    const todayExpense = todayExpenses[0]?.total || 0;

    const balanceBeforeOutgoing = oldBalance + totalInflows + todayIncome;
    const availableBalance = balanceBeforeOutgoing - todayLoanGiven - todayExpense;

    res.json({
      success: true,
      date: targetDate,
      totalLoanCollection,
      totalSavingsCollection,
      todayIncome,
      totalInflows,
      oldBalance,
      balanceBeforeOutgoing,
      todayLoanGiven,
      todayExpense,
      availableBalance,
      committeeMembers,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getTodayCommitteeCollection = async (req, res) => {
  try {
    const { committeeMemberId } = req.params;

    const queryDateStr = req.query.date;
    const targetDate = queryDateStr ? new Date(queryDateStr) : new Date();

    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
    });
    const parts = formatter.formatToParts(targetDate);
    const year = parts.find((p) => p.type === 'year').value;
    const month = parts.find((p) => p.type === 'month').value;
    const day = parts.find((p) => p.type === 'day').value;

    const startStr = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T00:00:00.000+05:30`;
    const endStr = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T23:59:59.999+05:30`;

    const start = new Date(startStr);
    const end = new Date(endStr);

    const Saving = require("../models/Saving");

    const committeeMember = await CommitteeMember.findById(committeeMemberId).select('_id name phoneNumber');

    if (!committeeMember) {
      return res.status(404).json({ success: false, message: 'Committee member not found' });
    }

    const rawCollections = await Payment.find({
      committeeMember: committeeMemberId,
      paymentDate: { $gte: start, $lte: end },
    })
      .populate({
        path: 'loan',
        select: 'loanNumber member',
        populate: {
          path: 'member',
          select: 'memberId name phone',
        }
      })
      .sort({ paymentDate: 1 })
      .lean();

    const rawSavings = await Saving.find({
      committeeMember: committeeMemberId,
      savingDate: { $gte: start, $lte: end },
    })
      .populate('user', 'name')
      .sort({ savingDate: 1 })
      .lean();

    const collections = rawCollections.map((payment) => ({
      _id: payment._id,
      member: payment.loan && payment.loan.member ? payment.loan.member : null,
      loanNumber: payment.loan ? payment.loan.loanNumber : null,
      amount: payment.amount,
      paymentDate: payment.paymentDate,
    }));

    const savings = rawSavings.map((saving) => ({
      _id: saving._id,
      user: saving.user ? saving.user : null,
      amount: saving.amount,
      savingDate: saving.savingDate,
    }));

    const totalLoanCollection = collections.reduce((total, payment) => total + Number(payment.amount || 0), 0);
    const totalSavingsCollection = savings.reduce((total, s) => total + Number(s.amount || 0), 0);
    const totalCollection = totalLoanCollection + totalSavingsCollection;

    return res.json({
      success: true,
      date: targetDate,
      committeeMember,
      totalLoanCollection,
      totalSavingsCollection,
      totalCollection,
      collections,
      savings,
    });
  } catch (error) {
    console.error('Today committee collection error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to load committee collection',
    });
  }
};

module.exports = {
  getTodayCollection,
  getTodayCommitteeCollection,
};
