const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  loan: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Loan',
    required: true,
  },
  amount: {
    type: Number,
    required: true,
  },
  paymentDate: {
    type: Date,
    required: true,
    default: Date.now,
  },
  paymentMethod: {
    type: String,
    enum: ['Cash', 'UPI', 'Bank'],
    default: 'Cash',
  },
  collectionType: {
    type: String,
    enum: ["regular", "principal", "interest"],
    default: "regular"
  },
  referenceNumber: {
    type: String,
  },
  committeeMember: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CommitteeMember',
    required: true,
  },
  collectedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: true,
  }
}, { timestamps: true });

// committeeMember first: optimal for getTodayCommitteeCollection
// (match committeeMember, then scope paymentDate range)
paymentSchema.index({ committeeMember: 1, paymentDate: -1 });

// loan + date: used by getPayments (history for a single loan)
paymentSchema.index({
  loan: 1,
  paymentDate: -1,
});

// paymentDate only: used by $facet "all payments before date" aggregations
paymentSchema.index({ paymentDate: -1 });

module.exports = mongoose.model('Payment', paymentSchema);
