const mongoose = require("mongoose");

const loanSchema = new mongoose.Schema(
  {
    member: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Member",
      required: true,
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

module.exports = mongoose.model("Loan", loanSchema);
