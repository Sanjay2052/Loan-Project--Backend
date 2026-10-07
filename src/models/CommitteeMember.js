const mongoose = require("mongoose");

const committeeMemberSchema = new mongoose.Schema(
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
  },
  {
    timestamps: true,
  }
);

committeeMemberSchema.index({
  name: 1,
});

module.exports = mongoose.model("CommitteeMember", committeeMemberSchema);
