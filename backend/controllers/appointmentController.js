const Appointment = require('../models/Appointment');
const Doctor = require('../models/Doctor');
const Patient = require('../models/Patient');
const Billing = require('../models/Billing');

// @desc    Get appointments (filtered by doctorId or patientId query param)
// @route   GET /api/appointments
// @access  Protected
exports.getAppointments = async (req, res) => {
  try {
    const { doctorId, patientId } = req.query;
    let filter = {};

    if (doctorId) {
      filter.doctorId = doctorId;
    }

    if (patientId) {
      filter.patientId = patientId;
    }

    const appointments = await Appointment.find(filter)
      .populate('doctorId', 'name email specialization profilePhoto')
      .populate('patientId', 'name email')
      .sort({ date: -1 })
      .lean();

    // Attach patient profile data for each appointment
    const enhancedAppointments = await Promise.all(appointments.map(async (app) => {
      if (app.patientId) {
        const profile = await Patient.findOne({ userId: app.patientId._id }).lean();
        return { ...app, patientProfile: profile };
      }
      return app;
    }));

    res.json(enhancedAppointments);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get appointments for the logged-in doctor (by their Doctor profile)
// @route   GET /api/appointments/my-appointments
// @access  Doctor
exports.getMyAppointmentsAsDoctor = async (req, res) => {
  try {
    // Find Doctor profile linked to this user account
    const doctorProfile = await Doctor.findOne({ userId: req.user._id });
    if (!doctorProfile) {
      return res.status(404).json({ message: 'Doctor profile not found for this account' });
    }

    const appointments = await Appointment.find({ doctorId: doctorProfile._id })
      .populate('patientId', 'name email')
      .sort({ date: -1 })
      .lean();

    // Attach patient profile data
    const enhancedAppointments = await Promise.all(appointments.map(async (app) => {
      if (app.patientId) {
        const profile = await Patient.findOne({ userId: app.patientId._id }).lean();
        return { ...app, patientProfile: profile };
      }
      return app;
    }));

    res.json(enhancedAppointments);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get appointments for the logged-in patient
// @route   GET /api/appointments/my-appointments
// @access  Patient
exports.getMyAppointmentsAsPatient = async (req, res) => {
  try {
    const appointments = await Appointment.find({ patientId: req.user._id })
      .populate('doctorId', 'name email specialization profilePhoto phone')
      .sort({ date: -1 })
      .lean();

    res.json(appointments);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get appointment by ID
// @route   GET /api/appointments/:id
// @access  Protected
exports.getAppointmentById = async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id)
      .populate('doctorId', 'name email specialization profilePhoto')
      .populate('patientId', 'name email')
      .lean();

    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    // Attach patient profile data
    if (appointment.patientId) {
      const profile = await Patient.findOne({ userId: appointment.patientId._id }).lean();
      appointment.patientProfile = profile;
    }

    res.json(appointment);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Create appointment (patient books)
// @route   POST /api/appointments
// @access  Patient
exports.createAppointment = async (req, res) => {
  try {
    const { doctorId, patientName, patientAge, patientAddress, patientPhone, date, time, description } = req.body;

    if (!doctorId || !patientName || !date || !time) {
      return res.status(400).json({ message: 'Required fields are missing: doctorId, patientName, date, time' });
    }

    // Check if the Patient profile exists (Phase 1.5 fix)
    const patientProfile = await Patient.findOne({ userId: req.user._id });
    if (!patientProfile) {
      return res.status(400).json({ message: 'Please complete your medical profile first before booking an appointment.' });
    }

    // Verify doctor exists and is active
    const doctor = await Doctor.findOne({ _id: doctorId, isActive: true });
    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found or is not available' });
    }

    const appointment = await Appointment.create({
      doctorId,
      patientId: req.user._id,
      patientName,
      patientAge,
      patientAddress,
      patientPhone,
      date: new Date(date),
      time,
      description,
      status: 'Pending',
    });

    const populated = await Appointment.findById(appointment._id)
      .populate('doctorId', 'name email specialization profilePhoto')
      .populate('patientId', 'name email')
      .lean();

    res.status(201).json(populated);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Update appointment status
// @route   PUT /api/appointments/:id/status
// @access  Doctor or Admin
exports.updateAppointmentStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['Pending', 'Confirmed', 'Completed', 'Cancelled'];

    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ message: `Status must be one of: ${validStatuses.join(', ')}` });
    }

    const appointment = await Appointment.findById(req.params.id);

    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    // Admin can update any; doctor can only update their own appointments
    if (req.user.role !== 'admin') {
      const doctorProfile = await Doctor.findOne({ userId: req.user._id });
      if (
        !doctorProfile ||
        appointment.doctorId.toString() !== doctorProfile._id.toString()
      ) {
        return res.status(403).json({ message: 'Access denied' });
      }
    }

    appointment.status = status;
    await appointment.save();

    // Billing Automation: Auto-generate invoice when marked Completed
    if (status === 'Completed') {
      const existingBilling = await Billing.findOne({ appointmentId: appointment._id });
      if (!existingBilling) {
        const newBill = await Billing.create({
          appointmentId: appointment._id,
          patientId: appointment.patientId,
          doctorId: appointment.doctorId,
          amount: 1500, // Default for now
          status: 'Pending'
        });
        // Flag the appointment so patient notification is triggered
        await Appointment.findByIdAndUpdate(appointment._id, {
          hasBill: true,
          billingId: newBill._id,
        });
      }
    }

    const populated = await Appointment.findById(appointment._id)
      .populate('doctorId', 'name email specialization')
      .populate('patientId', 'name email')
      .lean();

    res.json(populated);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Update appointment details
// @route   PUT /api/appointments/:id
// @access  Doctor or Admin
exports.updateAppointment = async (req, res) => {
  try {
    let appointment = await Appointment.findById(req.params.id);

    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    // Admin can update any; doctor can only update their own; patient can cancel their own
    if (req.user.role !== 'admin') {
      if (req.user.role === 'doctor') {
        const doctorProfile = await Doctor.findOne({ userId: req.user._id });
        if (
          !doctorProfile ||
          appointment.doctorId.toString() !== doctorProfile._id.toString()
        ) {
          return res.status(403).json({ message: 'Access denied' });
        }
      } else if (req.user.role === 'patient') {
        if (appointment.patientId.toString() !== req.user._id.toString()) {
          return res.status(403).json({ message: 'Access denied' });
        }
      }
    }

    const { date, time, description, notes, status } = req.body;

    if (date) appointment.date = new Date(date);
    if (time) appointment.time = time;
    if (description !== undefined) appointment.description = description;
    if (notes !== undefined) appointment.notes = notes;
    if (status) appointment.status = status;

    await appointment.save();

    res.json(appointment);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Delete appointment
// @route   DELETE /api/appointments/:id
// @access  Patient (own) or Admin
exports.deleteAppointment = async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id);

    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    // Only admin or the patient who made the appointment can delete
    if (
      req.user.role !== 'admin' &&
      appointment.patientId.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({ message: 'Access denied' });
    }

    await Appointment.findByIdAndDelete(req.params.id);

    res.json({ message: 'Appointment deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Doctor requests to reschedule a confirmed appointment
// @route   POST /api/appointments/:id/request-reschedule
// @access  Doctor
exports.requestReschedule = async (req, res) => {
  try {
    const { rescheduleDate, rescheduleTime, reason } = req.body;
    
    if (!rescheduleDate || !rescheduleTime || !reason) {
      return res.status(400).json({ message: 'Please provide new date, time, and reason.' });
    }

    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    // Verify it's the doctor's appointment
    const doctorProfile = await Doctor.findOne({ userId: req.user._id });
    if (!doctorProfile || appointment.doctorId.toString() !== doctorProfile._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (appointment.status !== 'Confirmed') {
      return res.status(400).json({ message: 'Only confirmed appointments can be rescheduled.' });
    }

    // Check if the appointment is today (doctor cannot reschedule on the day of the appointment)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const appointmentDate = new Date(appointment.date);
    appointmentDate.setHours(0, 0, 0, 0);

    if (appointmentDate.getTime() === today.getTime()) {
      return res.status(400).json({ message: 'Cannot request a reschedule on the same day as the appointment.' });
    }

    appointment.rescheduleRequested = true;
    appointment.rescheduleRequestedDate = new Date(rescheduleDate);
    appointment.rescheduleRequestedTime = rescheduleTime;
    appointment.rescheduleReason = reason;

    await appointment.save();

    res.json({ message: 'Reschedule request submitted to Admin', appointment });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Admin gets all reschedule requests
// @route   GET /api/appointments/reschedule-requests
// @access  Admin
exports.getRescheduleRequests = async (req, res) => {
  try {
    const requests = await Appointment.find({ rescheduleRequested: true })
      .populate('doctorId', 'name email specialization profilePhoto')
      .populate('patientId', 'name email')
      .sort({ date: 1 })
      .lean();

    res.json(requests);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Admin approves a reschedule request
// @route   POST /api/appointments/:id/approve-reschedule
// @access  Admin
exports.approveReschedule = async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id);
    if (!appointment || !appointment.rescheduleRequested) {
      return res.status(404).json({ message: 'Pending reschedule request not found for this appointment' });
    }

    // Update the actual date and time to the requested ones
    appointment.date = appointment.rescheduleRequestedDate;
    appointment.time = appointment.rescheduleRequestedTime;
    
    // Set status flag for patient UI
    appointment.isRescheduled = true;
    appointment.rescheduleNote = `Rescheduled by Doctor: ${appointment.rescheduleReason}`;

    // Reset request flags
    appointment.rescheduleRequested = false;
    appointment.rescheduleRequestedDate = undefined;
    appointment.rescheduleRequestedTime = undefined;
    appointment.rescheduleReason = undefined;

    await appointment.save();

    res.json({ message: 'Reschedule approved successfully', appointment });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Admin rejects a reschedule request
// @route   POST /api/appointments/:id/reject-reschedule
// @access  Admin
exports.rejectReschedule = async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id);
    if (!appointment || !appointment.rescheduleRequested) {
      return res.status(404).json({ message: 'Pending reschedule request not found for this appointment' });
    }

    // Just reset the request flags, keep original date/time
    appointment.rescheduleRequested = false;
    appointment.rescheduleRequestedDate = undefined;
    appointment.rescheduleRequestedTime = undefined;
    appointment.rescheduleReason = undefined;

    await appointment.save();

    res.json({ message: 'Reschedule rejected successfully', appointment });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
