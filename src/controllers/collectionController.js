const Payment = require("../models/Payment");

const getTodayCollection = async (req, res) => {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
    });
    const parts = formatter.formatToParts(new Date());
    const year = parts.find((p) => p.type === 'year').value;
    const month = parts.find((p) => p.type === 'month').value;
    const day = parts.find((p) => p.type === 'day').value;

    const startStr = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T00:00:00.000+05:30`;
    const endStr = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T23:59:59.999+05:30`;

    const start = new Date(startStr);
    const end = new Date(endStr);

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
