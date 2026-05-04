const express = require('express');
const { createReview, getReviews, getDoctorReviews } = require('../controllers/reviewController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/', getReviews);
router.get('/doctor/:doctorId', getDoctorReviews);
router.post('/', protect, authorize('patient'), createReview);

module.exports = router;
