const express = require('express');
const {
  register,
  login,
  getMe,
  refreshAccessToken,
  createDoctorAccount,
} = require('../controllers/authController');
const { protect, authorize } = require('../middleware/authMiddleware');
const validate = require('../middleware/validate');
const { registerRules, loginRules } = require('../middleware/validators/authValidators');

const router = express.Router();

router.post('/register', registerRules, validate, register);
router.post('/login', loginRules, validate, login);
router.post('/refresh', refreshAccessToken);
router.get('/me', protect, getMe);
router.post('/create-doctor', protect, authorize('admin'), createDoctorAccount);

module.exports = router;