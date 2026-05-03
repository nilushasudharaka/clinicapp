const express = require('express');
const {
  getAppointments,
  getMyAppointmentsAsDoctor,
  getMyAppointmentsAsPatient,
  getAppointmentById,
  createAppointment,
  updateAppointmentStatus,
  updateAppointment,
  deleteAppointment,
  requestReschedule,
  getRescheduleRequests,
  approveReschedule,
  rejectReschedule,
} = require('../controllers/appointmentController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

// All routes are protected
router.use(protect);

// Patient: get own appointments
router.get('/my-appointments/patient', authorize('patient'), getMyAppointmentsAsPatient);

// Doctor: get own appointments via Doctor profile lookup
router.get('/my-appointments/doctor', authorize('doctor'), getMyAppointmentsAsDoctor);

// Admin: Get all reschedule requests (MUST be before /:id)
router.get('/reschedule-requests', authorize('admin'), getRescheduleRequests);

// Generic filtered list (admin/doctor use with ?doctorId= or ?patientId=)
router.get('/', getAppointments);

// Single appointment by id
router.get('/:id', getAppointmentById);

// Patient books an appointment
router.post('/', authorize('patient'), createAppointment);

// Doctor/Admin update status
router.put('/:id/status', authorize('doctor', 'admin'), updateAppointmentStatus);

// Doctor: Request a reschedule for a confirmed appointment
router.post('/:id/request-reschedule', authorize('doctor'), requestReschedule);

// Admin: Approve or Reject a reschedule request
router.post('/:id/approve-reschedule', authorize('admin'), approveReschedule);
router.post('/:id/reject-reschedule', authorize('admin'), rejectReschedule);

// Doctor/Admin/Patient update appointment
router.put('/:id', updateAppointment);

// Patient/Admin delete
router.delete('/:id', deleteAppointment);

module.exports = router;
