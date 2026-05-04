const express = require('express');
const { 
  createPatientProfile, 
  getPatientProfile, 
  updatePatientProfile,
  deletePatient,
  getAllPatients,
  getPatientById
} = require('../controllers/patientController');
const { protect, authorize } = require('../middleware/authMiddleware');

const uploadMiddleware = require('../middleware/uploadMiddleware');

const validate = require('../middleware/validate');
const { patientProfileRules } = require('../middleware/validators/patientValidators');

const router = express.Router();

// Patient routes
router.post('/profile', protect, authorize('patient'), uploadMiddleware.single('profilePhoto'), patientProfileRules, validate, createPatientProfile);
router.get('/profile', protect, authorize('patient'), getPatientProfile);
router.put('/profile', protect, authorize('patient'), uploadMiddleware.single('profilePhoto'), patientProfileRules, validate, updatePatientProfile);

// Admin & Doctor routes
router.get('/', protect, authorize('admin', 'doctor'), getAllPatients);
router.get('/:id', protect, authorize('admin', 'doctor'), getPatientById);

// Admin only routes
router.delete('/:id', protect, authorize('admin'), deletePatient);

module.exports = router;
