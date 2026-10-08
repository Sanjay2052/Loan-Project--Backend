const Payment = require("../models/Payment");

const getTodayCollection = async (req, res) => {
  try {
    const start = new Date();
    start.setHours(0, 0, 0, 0);

    const end = new Date();
    end.setHours(23, 59, 59, 999);

    const result = await Payment.aggregate([
      {
        $match: {
          paymentDate: {
            $gte: start,
            $lte: end,
          },
        },
      },
      {
        $group: {
          _id: '$committeeMember',
          todayCollection: {
            $sum: '$amount',
          },
        },
      },
      {
        $lookup: {
          from: 'committeemembers',
          localField: '_id',
          foreignField: '_id',
          as: 'committeeMember',
        },
      },
      {
        $unwind: '$committeeMember',
      },
      {
        $project: {
          _id: 0,
          committeeMemberId: '$committeeMember._id',
          name: '$committeeMember.name',
          phoneNumber: '$committeeMember.phoneNumber',
          todayCollection: 1,
        },
      },
      {
        $sort: {
          todayCollection: -1,
        },
      },
    ]);

    const totalCollection = result.reduce(
      (total, item) => total + item.todayCollection,
      0
    );

    res.json({
      success: true,
      date: new Date(),
      totalCollection,
      committeeMembers: result,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getTodayCollection,
};
