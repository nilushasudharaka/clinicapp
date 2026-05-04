const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema(
  {
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Doctor',
      default: null,
    },
    overallRating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    doctorRatings: {
      professionalism: { type: Number, min: 1, max: 5, default: 0 },
      communication: { type: Number, min: 1, max: 5, default: 0 },
      treatmentQuality: { type: Number, min: 1, max: 5, default: 0 },
    },
    clinicRatings: {
      cleanliness: { type: Number, min: 1, max: 5, default: 0 },
      waitingTime: { type: Number, min: 1, max: 5, default: 0 },
      staffFriendliness: { type: Number, min: 1, max: 5, default: 0 },
    },
    quickFeedback: [{
      type: String,
    }],
    comment: {
      type: String,
      default: '', // Made optional
    },
    isAnonymous: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Review', reviewSchema);
