const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    phoneNumber: {
      type: String,
      required: true,
      trim: true,
    },
    place: {
      type: String,
      default: ''
    },
    member: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Member",
    },
    isSavingUser: {
      type: Boolean,
      default: false,
    },
    initialSavingsAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Supports getSavingUsers filter + sort: isSavingUser:true, sort createdAt:-1
userSchema.index({ isSavingUser: 1, createdAt: -1 });

// Supports phone lookups and search
userSchema.index({ phoneNumber: 1 });

module.exports = mongoose.model("User", userSchema);
