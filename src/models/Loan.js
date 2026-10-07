const mongoose = require("mongoose");

const loanSchema = new mongoose.Schema(
  {
    member: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Member",
      required: true,
    },

    committeeMember: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CommitteeMember",
      required: false,
    },

    loanNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    loanAmount: {
      type: Number,
      required: true,
      min: 1,
    },

    totalPaid: {
      type: Number,
      default: 0,
      min: 0,
    },

    remainingAmount: {
      type: Number,
      required: true,
      min: 0,
    },

    expectedPayment: {
      type: Number,
      default: 0,
      min: 0,
    },

    paymentFrequency: {
      type: String,
      enum: ["daily", "weekly", "monthly", "custom"],
      default: "weekly",
    },

    startDate: {
      type: Date,
      required: true,
    },

    status: {
      type: String,
      enum: ["active", "completed", "cancelled"],
      default: "active",
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
