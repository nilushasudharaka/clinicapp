const Doctor = require('../models/Doctor');
const Appointment = require('../models/Appointment');
const Patient = require('../models/Patient');
const Review = require('../models/Review');

// @desc    Create new doctor profile
// @route   POST /api/doctors
// @access  Admin
exports.createDoctor = async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      specialization,
      experience,
      qualifications,
      schedule,
      userId,
    } = req.body;

    // Validate required fields
    if (!name || !email || !phone || !specialization || !experience || !qualifications) {
      return res.status(400).json({
        message: 'All fields are required',
        missing: {
          name: !name,
          email: !email,
          phone: !phone,
          specialization: !specialization,
          experience: !experience,
          qualifications: !qualifications,
        },
      });
    }

    // Validate phone - exactly 10 digits
    const onlyDigits = phone.replace(/\D/g, '');
    if (onlyDigits.length !== 10) {
      return res.status(400).json({
        message: 'Phone number must be exactly 10 digits',
      });
    }

    // Check if doctor already exists
    const doctorExists = await Doctor.findOne({ email: email.toLowerCase() });
    if (doctorExists) {
      return res.status(400).json({ message: 'Doctor with this email already exists' });
    }

    let profilePhoto = null;
    if (req.file) {
      profilePhoto = `/uploads/${req.file.filename}`;
    }

    // Parse schedule if it's sent as stringified JSON
    let parsedSchedule = { days: [] };
    if (schedule) {
      try {
        const raw = typeof schedule === 'string' ? JSON.parse(schedule) : schedule;
        // Expect { days: [{ day, startTime, endTime }] }
        if (raw && Array.isArray(raw.days)) {
          parsedSchedule = { days: raw.days };
        }
      } catch (err) {
        parsedSchedule = { days: [] };
      }
    }

    const doctor = await Doctor.create({
      userId: userId || null,
      name: name.trim(),
      email: email.toLowerCase().trim(),
      phone: phone.trim(),
      specialization: specialization.trim(),
      experience: experience.trim(),
      qualifications: qualifications.trim(),
      schedule: parsedSchedule,
      profilePhoto,
    });

    res.status(201).json(doctor);
  } catch (error) {
    console.error('Doctor creation error:', error);
    res.status(500).json({
      message: 'Server error',
      error: error.message,
      details: error.errors
        ? Object.keys(error.errors).map((key) => `${key}: ${error.errors[key].message}`)
        : [],
    });
  }
};

// @desc    Get all doctors (admin view, includes inactive)
// @route   GET /api/doctors/admin/all
// @access  Admin
exports.getAllDoctorsAdmin = async (req, res) => {
  try {
    const doctors = await Doctor.find().lean();
    res.json(doctors);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get all active doctors (public)
// @route   GET /api/doctors
// @access  Public
exports.getAllDoctors = async (req, res) => {
  try {
    const doctors = await Doctor.find({ isActive: true }).lean();
    
    const enrichedDoctors = await Promise.all(doctors.map(async (doc) => {
      const reviews = await Review.find({ doctorId: doc._id });
      const avgRating = reviews.length > 0 
        ? (reviews.reduce((acc, r) => acc + r.overallRating, 0) / reviews.length).toFixed(1)
        : "5.0"; 
      return { ...doc, averageRating: avgRating, totalReviews: reviews.length };
    }));

    res.json(enrichedDoctors);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get the logged-in doctor's own profile
// @route   GET /api/doctors/my-profile
// @access  Doctor
exports.getMyDoctorProfile = async (req, res) => {
  try {
    const doctor = await Doctor.findOne({ userId: req.user._id }).lean();
    if (!doctor) {
      return res.status(404).json({ message: 'Doctor profile not found for this account' });
    }
    res.json(doctor);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Update the logged-in doctor's active status
// @route   PUT /api/doctors/my-profile/status
// @access  Doctor
exports.updateMyStatus = async (req, res) => {
  try {
    const { isActive } = req.body;
    if (isActive === undefined) {
      return res.status(400).json({ message: 'isActive field is required' });
    }

    const doctor = await Doctor.findOne({ userId: req.user._id });
    if (!doctor) {
      return res.status(404).json({ message: 'Doctor profile not found' });
    }

    doctor.isActive = isActive;
    await doctor.save();

    res.json({ message: 'Status updated successfully', isActive: doctor.isActive });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get doctor by ID
// @route   GET /api/doctors/:id
// @access  Public
exports.getDoctorById = async (req, res) => {
  try {
    const doctor = await Doctor.findOne({ _id: req.params.id, isActive: true }).lean();
    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found' });
    }

    const reviews = await Review.find({ doctorId: doctor._id });
    const avgRating = reviews.length > 0 
      ? (reviews.reduce((acc, r) => acc + r.overallRating, 0) / reviews.length).toFixed(1)
      : "5.0";

    res.json({ ...doctor, averageRating: avgRating, totalReviews: reviews.length });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Update doctor profile
// @route   PUT /api/doctors/:id
// @access  Admin
exports.updateDoctor = async (req, res) => {
  try {
    let doctor = await Doctor.findOne({ _id: req.params.id });

    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found' });
    }

    const updateData = { ...req.body };

    // Parse schedule if it's sent as stringified JSON
    if (updateData.schedule && typeof updateData.schedule === 'string') {
      try {
        const raw = JSON.parse(updateData.schedule);
        if (raw && Array.isArray(raw.days)) {
          updateData.schedule = { days: raw.days };
        } else {
          delete updateData.schedule;
        }
      } catch (err) {
        delete updateData.schedule;
      }
    }

    if (req.file) {
      updateData.profilePhoto = `/uploads/${req.file.filename}`;
    }

    doctor = await Doctor.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    });

    res.json(doctor);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Soft delete doctor
// @route   DELETE /api/doctors/:id
// @access  Admin
exports.deleteDoctor = async (req, res) => {
  try {
    const doctor = await Doctor.findById(req.params.id);

    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found' });
    }

    doctor.isActive = false;
    await doctor.save();

    res.json({ message: 'Doctor removed successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get admin dashboard stats
// @route   GET /api/doctors/admin/stats
// @access  Admin
exports.getAdminStats = async (req, res) => {
  try {
    const totalDoctors = await Doctor.countDocuments({ isActive: true });
    const totalAppointments = await Appointment.countDocuments();

    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

    const todayAppointments = await Appointment.countDocuments({
      date: { $gte: todayStart, $lt: todayEnd },
    });

    const pendingAppointments = await Appointment.countDocuments({ status: 'Pending' });

    // Count active Patient profiles for accurate patient count
    const totalPatients = await Patient.countDocuments({ isActive: true });

    res.json({
      totalDoctors,
      totalPatients,
      todayAppointments,
      pendingAppointments,
      totalAppointments,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
