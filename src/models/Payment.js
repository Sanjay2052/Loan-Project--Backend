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
  notes: {
    type: String,
  },
  collectedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: true,
  }
}, { timestamps: true });

module.exports = mongoose.model('Payment', paymentSchema);
