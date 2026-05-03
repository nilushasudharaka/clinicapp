const express = require('express');
const {
  register,
  login,
  getMe,
  refreshAccessToken,
  createDoctorAccount,
} = require('../controllers/authController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/refresh', refreshAccessToken);
router.get('/me', protect, getMe);
router.post('/create-doctor', protect, authorize('admin'), createDoctorAccount);

module.exports = router;