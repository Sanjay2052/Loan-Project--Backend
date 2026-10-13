const mongoose = require('mongoose');

const savingSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  amount: {
    type: Number,
    required: true,
    min: 0
  },

  committeeMember: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CommitteeMember',
    required: true
  },

  savingDate: {
    type: Date,
    default: Date.now
  },

  collectedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: true
  }
}, {
  timestamps: true
});

savingSchema.index({ user: 1, savingDate: -1 });

// Used by getTodayCommitteeCollection: filter by committeeMember + savingDate range
savingSchema.index({ committeeMember: 1, savingDate: -1 });

// Used by $facet date-range aggregations in collectionController / reportController
savingSchema.index({ savingDate: -1 });

module.exports = mongoose.model('Saving', savingSchema);
