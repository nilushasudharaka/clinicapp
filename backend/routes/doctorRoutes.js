const express = require('express');
const router = express.Router();
const {
  createDoctor,
  getAllDoctors,
  getAllDoctorsAdmin,
  getMyDoctorProfile,
  getDoctorById,
  updateDoctor,
  deleteDoctor,
  getAdminStats,
} = require('../controllers/doctorController');
const uploadMiddleware = require('../middleware/uploadMiddleware');
const { protect, authorize } = require('../middleware/authMiddleware');

// Admin stats - must be before /:id route
router.get('/admin/stats', protect, authorize('admin'), getAdminStats);

// Admin: get all doctors (including inactive)
router.get('/admin/all', protect, authorize('admin'), getAllDoctorsAdmin);

// Doctor: get own profile
router.get('/my-profile', protect, authorize('doctor'), getMyDoctorProfile);

// Public: get all active doctors
// Admin: create doctor profile
router
  .route('/')
  .get(getAllDoctors)
  .post(protect, authorize('admin'), uploadMiddleware.single('profilePhoto'), createDoctor);

// Public: get single doctor | Admin: update/delete
router
  .route('/:id')
  .get(getDoctorById)
  .put(protect, authorize('admin'), uploadMiddleware.single('profilePhoto'), updateDoctor)
  .delete(protect, authorize('admin'), deleteDoctor);

module.exports = router;
