const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const emailRegex = /^\S+@\S+\.\S+$/;

const validateCommonAuthFields = ({ name, email, password }) => {
  if (!name || !email || !password) {
    return 'Name, email and password are required';
  }
  if (!emailRegex.test(email)) {
    return 'Please provide a valid email address';
  }
  if (password.length < 6) {
    return 'Password must be at least 6 characters long';
  }
  return null;
};

const signAccessToken = (user) => {
  return jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: '1h',
  });
};

const signRefreshToken = (user) => {
  return jwt.sign({ id: user._id }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: '7d',
  });
};

const signTokens = (user) => {
  return {
    accessToken: signAccessToken(user),
    refreshToken: signRefreshToken(user),
  };
};

// @desc    Public register (patient only)
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const role = req.body.role || 'patient';

    if (role !== 'patient') {
      return res.status(403).json({ message: 'Only patients can register' });
    }

    const fieldError = validateCommonAuthFields({ name, email, password });
    if (fieldError) {
      return res.status(400).json({ message: fieldError });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      role: 'patient',
    });

    return res.status(201).json({
      message: 'Patient account created successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Login for all roles
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const startTime = Date.now();

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    console.log(`📧 Login attempt for: ${email}`);
    const findStart = Date.now();
    const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+password');
    const findTime = Date.now() - findStart;
    console.log(`⏱️  User lookup: ${findTime}ms`);
    
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const compareStart = Date.now();
    const isMatch = await bcrypt.compare(password, user.password);
    const compareTime = Date.now() - compareStart;
    console.log(`⏱️  Password comparison: ${compareTime}ms`);
    
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const { accessToken, refreshToken } = signTokens(user);
    const totalTime = Date.now() - startTime;
    console.log(`✅ Login success for ${email} - Total: ${totalTime}ms`);

    return res.json({
      accessToken,
      refreshToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('❌ Login error:', error.message);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get current user profile
// @route   GET /api/auth/me
// @access  Protected
exports.getMe = async (req, res) => {
  return res.json({ user: req.user });
};

// @desc    Refresh access token
// @route   POST /api/auth/refresh
// @access  Public (but requires valid refresh token)
exports.refreshAccessToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({ message: 'Refresh token is required' });
    }

    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    const { accessToken, refreshToken: newRefreshToken } = signTokens(user);

    return res.json({
      accessToken,
      refreshToken: newRefreshToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    return res.status(401).json({ message: 'Invalid refresh token' });
  }
};

// @desc    Admin creates doctor account
// @route   POST /api/auth/create-doctor
// @access  Admin only
exports.createDoctorAccount = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { name, email, password } = req.body;
    const fieldError = validateCommonAuthFields({ name, email, password });
    if (fieldError) {
      return res.status(400).json({ message: fieldError });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const doctorUser = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      role: 'doctor',
    });

    return res.status(201).json({
      message: 'Doctor account created successfully',
      user: {
        id: doctorUser._id,
        name: doctorUser.name,
        email: doctorUser.email,
        role: doctorUser.role,
      },
    });
  } catch (error) {
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};