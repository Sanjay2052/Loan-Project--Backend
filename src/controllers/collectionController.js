const Payment         = require("../models/Payment");
const Saving          = require("../models/Saving");
const Loan            = require("../models/Loan");
const Expense         = require("../models/Expense");
const Income          = require("../models/Income");
const CommitteeMember = require("../models/CommitteeMember");

// ─── Shared helper ───────────────────────────────────────────────────────────

/**
 * Returns { start, end } as UTC Date objects for the IST calendar day
 * that contains `date` (or today if not provided).
 */
function istDayBounds(date = new Date()) {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kolkata",
    year:  "numeric",
    month: "2-digit",
    day:   "2-digit",
  });
  const parts = fmt.formatToParts(date);
  const y = parts.find((p) => p.type === "year").value;
  const m = parts.find((p) => p.type === "month").value;
  const d = parts.find((p) => p.type === "day").value;

  return {
    start: new Date(`${y}-${m}-${d}T00:00:00.000+05:30`),
    end:   new Date(`${y}-${m}-${d}T23:59:59.999+05:30`),
  };
}

// ─── getTodayCollection ──────────────────────────────────────────────────────
// GET /api/collections/today?date=2026-10-13
//
// Optimisation: replaces 8 sequential aggregations with 5 parallel $facet
// pipelines (one per collection type).  Each $facet resolves "before today"
// and "today" in a single MongoDB round-trip.

const getTodayCollection = async (req, res) => {
  try {
    const queryDateStr = req.query.date;
    const targetDate   = queryDateStr ? new Date(queryDateStr) : new Date();
    const { start, end } = istDayBounds(targetDate);

    // ── 1. Run all five $facet aggregations in parallel ──────────────────
    const [payFacet, savFacet, incFacet, expFacet, loanFacet] =
      await Promise.all([

        // Payments (loan collections) — grouped by committeeMember for the
        // per-member breakdown AND a single total for "before today"
        Payment.aggregate([
          {
            $facet: {
              byMemberToday: [
                { $match: { paymentDate: { $gte: start, $lte: end } } },
                { $group: { _id: "$committeeMember", total: { $sum: "$amount" } } },
              ],
              beforeTotal: [
                { $match: { paymentDate: { $lt: start } } },
                { $group: { _id: null, total: { $sum: "$amount" } } },
              ],
            },
          },
        ]),

        // Savings — same structure
        Saving.aggregate([
          {
            $facet: {
              byMemberToday: [
                { $match: { savingDate: { $gte: start, $lte: end } } },
                { $group: { _id: "$committeeMember", total: { $sum: "$amount" } } },
              ],
              beforeTotal: [
                { $match: { savingDate: { $lt: start } } },
                { $group: { _id: null, total: { $sum: "$amount" } } },
              ],
            },
          },
        ]),

        // Income
        Income.aggregate([
          {
            $facet: {
              todayTotal: [
                { $match: { incomeDate: { $gte: start, $lte: end } } },
                { $group: { _id: null, total: { $sum: "$amount" } } },
              ],
              beforeTotal: [
                { $match: { incomeDate: { $lt: start } } },
                { $group: { _id: null, total: { $sum: "$amount" } } },
              ],
            },
          },
        ]),

        // Expenses
        Expense.aggregate([
          {
            $facet: {
              todayTotal: [
                { $match: { expenseDate: { $gte: start, $lte: end } } },
                { $group: { _id: null, total: { $sum: "$amount" } } },
              ],
              beforeTotal: [
                { $match: { expenseDate: { $lt: start } } },
                { $group: { _id: null, total: { $sum: "$amount" } } },
              ],
            },
          },
        ]),

        // Loans given — grouped by loanType so we can apply the 90 % rule
        Loan.aggregate([
          {
            $facet: {
              todayByType: [
                { $match: { createdAt: { $gte: start, $lte: end } } },
                { $group: { _id: "$loanType", total: { $sum: "$requestedAmount" } } },
              ],
              beforeByType: [
                { $match: { createdAt: { $lt: start } } },
                { $group: { _id: "$loanType", total: { $sum: "$requestedAmount" } } },
              ],
            },
          },
        ]),
      ]);

    // ── 2. Extract results ───────────────────────────────────────────────

    // Helper: sum rows applying 90 % for weekly loans
    const calcLoanGiven = (rows) =>
      (rows || []).reduce(
        (sum, r) => sum + (r._id === "weekly" ? r.total * 0.9 : r.total),
        0
      );

    // Per-committee-member maps (today only)
    const loanMap   = {};
    const savingMap = {};
    const memberIds = new Set();

    (payFacet[0]?.byMemberToday || []).forEach((r) => {
      if (r._id) {
        const id = r._id.toString();
        loanMap[id] = r.total;
        memberIds.add(id);
      }
    });
    (savFacet[0]?.byMemberToday || []).forEach((r) => {
      if (r._id) {
        const id = r._id.toString();
        savingMap[id] = r.total;
        memberIds.add(id);
      }
    });

    // Fetch committee member names for the IDs that had activity today
    const members = memberIds.size
      ? await CommitteeMember.find({ _id: { $in: [...memberIds] } })
          .select("name phoneNumber")
          .lean()
      : [];

    const committeeMembers = members
      .map((m) => {
        const id      = m._id.toString();
        const loanCol = loanMap[id]   || 0;
        const savCol  = savingMap[id] || 0;
        return {
          committeeMemberId:    m._id,
          name:                 m.name,
          phoneNumber:          m.phoneNumber,
          todayLoanCollection:  loanCol,
          todaySavingsCollection: savCol,
          todayCollection:      loanCol + savCol,
        };
      })
      .sort((a, b) => b.todayCollection - a.todayCollection);

    // Today totals
    const totalLoanCollection    = Object.values(loanMap).reduce((s, v) => s + v, 0);
    const totalSavingsCollection = Object.values(savingMap).reduce((s, v) => s + v, 0);
    const totalInflows           = totalLoanCollection + totalSavingsCollection;

    const todayIncome   = incFacet[0]?.todayTotal[0]?.total  || 0;
    const todayExpense  = expFacet[0]?.todayTotal[0]?.total  || 0;
    const todayLoanGiven = calcLoanGiven(loanFacet[0]?.todayByType);

    // Old Balance = everything before today
    const pastPayTotal  = payFacet[0]?.beforeTotal[0]?.total || 0;
    const pastSavTotal  = savFacet[0]?.beforeTotal[0]?.total || 0;
    const pastIncTotal  = incFacet[0]?.beforeTotal[0]?.total || 0;
    const pastExpTotal  = expFacet[0]?.beforeTotal[0]?.total || 0;
    const pastLoanGiven = calcLoanGiven(loanFacet[0]?.beforeByType);

    const cashInPast = pastPayTotal + pastSavTotal + pastIncTotal;
    const oldBalance = cashInPast - pastLoanGiven - pastExpTotal;

    // Final balance
    const balanceBeforeOutgoing = oldBalance + totalInflows + todayIncome;
    const availableBalance      = balanceBeforeOutgoing - todayLoanGiven - todayExpense;

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

// ─── getTodayCommitteeCollection ─────────────────────────────────────────────
// GET /api/collections/today/committee/:committeeMemberId?date=2026-10-13

const getTodayCommitteeCollection = async (req, res) => {
  try {
    const { committeeMemberId } = req.params;
    const queryDateStr = req.query.date;
    const targetDate   = queryDateStr ? new Date(queryDateStr) : new Date();
    const { start, end } = istDayBounds(targetDate);

    const committeeMember = await CommitteeMember.findById(committeeMemberId)
      .select("_id name phoneNumber")
      .lean();

    if (!committeeMember) {
      return res
        .status(404)
        .json({ success: false, message: "Committee member not found" });
    }

    // Fetch loan payments and savings in parallel
    const [rawCollections, rawSavings] = await Promise.all([
      Payment.find({
        committeeMember: committeeMemberId,
        paymentDate: { $gte: start, $lte: end },
      })
        .populate({
          path: "loan",
          select: "loanNumber member",
          populate: { path: "member", select: "memberId name phone" },
        })
        .sort({ paymentDate: 1 })
        .lean(),

      Saving.find({
        committeeMember: committeeMemberId,
        savingDate: { $gte: start, $lte: end },
      })
        .populate("user", "name")
        .sort({ savingDate: 1 })
        .lean(),
    ]);

    const collections = rawCollections.map((p) => ({
      _id:        p._id,
      member:     p.loan?.member ?? null,
      loanNumber: p.loan?.loanNumber ?? null,
      amount:     p.amount,
      paymentDate: p.paymentDate,
    }));

    const savings = rawSavings.map((s) => ({
      _id:         s._id,
      user:        s.user ?? null,
      amount:      s.amount,
      savingDate:  s.savingDate,
    }));

    const totalLoanCollection    = collections.reduce((t, p) => t + Number(p.amount || 0), 0);
    const totalSavingsCollection = savings.reduce((t, s) => t + Number(s.amount || 0), 0);
    const totalCollection        = totalLoanCollection + totalSavingsCollection;

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
    console.error("Today committee collection error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to load committee collection",
    });
  }
};

module.exports = {
  getTodayCollection,
  getTodayCommitteeCollection,
};
