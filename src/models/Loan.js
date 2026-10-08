const mongoose = require("mongoose");

const loanSchema = new mongoose.Schema(
  {
    member: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Member",
      required: true
    },
    committeeMember: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CommitteeMember",
      required: true
    },
    loanNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    loanType: {
      type: String,
      enum: ["weekly", "monthly"],
      required: true
    },
    requestedAmount: {
      type: Number,
      required: true,
      min: 0
    },
    amountGiven: {
      type: Number,
      required: true,
      min: 0
    },
    weeklyAmount: {
      type: Number,
      default: 0
    },
    monthlyInterest: {
      type: Number,
      default: 0
    },
    totalToCollect: {
      type: Number,
      required: true
    },
    totalPaid: {
      type: Number,
      default: 0
    },
    principalPaid: {
      type: Number,
      default: 0
    },
    interestPaid: {
      type: Number,
      default: 0
    },
    remainingAmount: {
      type: Number,
      default: 0
    },
    status: {
      type: String,
      enum: ["active", "completed", "cancelled"],
      default: "active"
    },
    startDate: {
      type: Date,
      required: true
    },
    notes: {
      type: String,
      trim: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

loanSchema.index({ member: 1 });
loanSchema.index({ committeeMember: 1 });
loanSchema.index({ status: 1 });
loanSchema.index({ createdAt: -1 });

module.exports = mongoose.model("Loan", loanSchema);
