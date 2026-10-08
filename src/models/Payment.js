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

paymentSchema.index({
  paymentDate: 1,
  committeeMember: 1,
});

paymentSchema.index({
  loan: 1,
  paymentDate: -1,
});

module.exports = mongoose.model('Payment', paymentSchema);
