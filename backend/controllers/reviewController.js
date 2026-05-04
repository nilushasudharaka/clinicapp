const Review = require('../models/Review');
const Doctor = require('../models/Doctor');

// @desc    Create a new review
// @route   POST /api/reviews
// @access  Patient
exports.createReview = async (req, res) => {
  try {
    const { 
      doctorId, 
      overallRating, 
      doctorRatings, 
      clinicRatings, 
      quickFeedback, 
      comment, 
      isAnonymous 
    } = req.body;

    if (!overallRating) {
      return res.status(400).json({ message: 'Overall rating is required' });
    }

    const review = await Review.create({
      patientId: req.user._id,
      doctorId: doctorId || null,
      overallRating,
      doctorRatings: doctorRatings || {},
      clinicRatings: clinicRatings || {},
      quickFeedback: quickFeedback || [],
      comment: comment || '',
      isAnonymous: !!isAnonymous,
    });

    res.status(201).json(review);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get all reviews
// @route   GET /api/reviews
// @access  Public
exports.getReviews = async (req, res) => {
  try {
    const reviews = await Review.find()
      .populate('patientId', 'name')
      .populate({
        path: 'doctorId',
        select: 'name specialization',
      })
      .sort({ createdAt: -1 });

    res.json(reviews);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get doctor specific reviews
// @route   GET /api/reviews/doctor/:doctorId
// @access  Public
exports.getDoctorReviews = async (req, res) => {
  try {
    const reviews = await Review.find({ doctorId: req.params.doctorId })
      .populate('patientId', 'name')
      .sort({ createdAt: -1 });

    res.json(reviews);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
