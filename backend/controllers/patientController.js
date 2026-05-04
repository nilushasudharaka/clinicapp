const Patient = require('../models/Patient');
const Appointment = require('../models/Appointment');
const Billing = require('../models/Billing');

exports.createPatientProfile = async (req, res) => {
  try {
    const existing = await Patient.findOne({ userId: req.user._id });
    if (existing) {
      return res.status(400).json({ message: 'Patient profile already exists' });
    }

    const patient = await Patient.create({
      userId: req.user._id,
      dateOfBirth: req.body.dateOfBirth,
      gender: req.body.gender,
      bloodGroup: req.body.bloodGroup || '',
      address: req.body.address || '',
      emergencyContact: req.body.emergencyContact ? JSON.parse(req.body.emergencyContact) : {},
      profilePhoto: req.file ? req.file.path.replace(/\\/g, '/') : null,
      isActive: true,
    });

    res.status(201).json(patient);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.getPatientProfile = async (req, res) => {
  try {
    const patient = await Patient.findOne({ userId: req.user._id }).populate('userId', 'name email');
    if (!patient) {
      return res.status(404).json({ message: 'Profile not found' });
    }
    res.json(patient);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.updatePatientProfile = async (req, res) => {
  try {
    const patient = await Patient.findOne({ userId: req.user._id });
    if (!patient) {
      return res.status(404).json({ message: 'Profile not found' });
    }

    const { bloodGroup, address, emergencyContact } = req.body;
    if (bloodGroup) patient.bloodGroup = bloodGroup;
    if (address) patient.address = address;
    if (emergencyContact) patient.emergencyContact = JSON.parse(emergencyContact);
    if (req.file) {
      patient.profilePhoto = req.file.path.replace(/\\/g, '/');
    }

    await patient.save();
    res.json(patient);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.getAllPatients = async (req, res) => {
  try {
    const patients = await Patient.find({ isActive: true })
      .populate('userId', 'name email phone profilePhoto')
      .sort({ createdAt: -1 });
    res.json(patients);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.getPatientById = async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.id)
      .populate('userId', 'name email phone profilePhoto');
    if (!patient) {
      return res.status(404).json({ message: 'Patient not found' });
    }
    res.json(patient);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.deletePatient = async (req, res) => {
  try {
    const patientId = req.params.id; // this is Patient._id
    const patient = await Patient.findById(patientId);
    
    if (!patient) {
      return res.status(404).json({ message: 'Patient not found' });
    }

    // Soft delete the patient
    patient.isActive = false;
    await patient.save();

    // CASCADING DELETES (Phase 1.5 Fix)
    // 1. Cancel all Pending/Confirmed appointments
    await Appointment.updateMany(
      { 
        patientId: patient.userId, // because Appointment references User._id
        status: { $in: ['Pending', 'Confirmed'] } 
      },
      { $set: { status: 'Cancelled' } }
    );

    // 2. Cancel all unpaid bills
    await Billing.updateMany(
      {
        patientId: patient.userId,
        status: 'Pending'
      },
      { $set: { status: 'Cancelled' } }
    );

    res.json({ message: 'Patient soft-deleted and related records cancelled successfully.' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
