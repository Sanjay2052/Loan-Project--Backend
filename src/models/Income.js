const mongoose = require("mongoose");

const incomeSchema = new mongoose.Schema(
  {
    incomeName: {
      type: String,
      required: true,
      trim: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 1,
    },
    incomeDate: {
      type: Date,
      default: Date.now,
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

incomeSchema.index({ incomeDate: -1 });

module.exports = mongoose.model("Income", incomeSchema);
