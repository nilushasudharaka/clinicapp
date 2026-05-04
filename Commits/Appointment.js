const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema(
  {
    // References Doctor profile (_id from Doctor collection)
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Doctor',
      required: true,
    },
    // References User account of the patient
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    patientName: {
      type: String,
      required: true,
    },
    patientAge: {
      type: String,
    },
    patientAddress: {
      type: String,
    },
    patientPhone: {
      type: String,
    },
    date: {
      type: Date,
      required: true,
    },
    time: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['Pending', 'Confirmed', 'Completed', 'Cancelled'],
      default: 'Pending',
    },
    description: {
      type: String,
    },
    notes: {
      type: String,
    },
    // Reschedule Request Fields (Doctor -> Admin)
    rescheduleRequested: {
      type: Boolean,
      default: false,
    },
    rescheduleRequestedDate: {
      type: Date,
    },
    rescheduleRequestedTime: {
      type: String,
    },
    rescheduleReason: {
      type: String,
    },
    // Reschedule Status (Admin -> Patient)
    isRescheduled: {
      type: Boolean,
      default: false,
    },
    rescheduleNote: {
      type: String,
    },
    // Billing link — set when admin creates a bill for this appointment
    hasBill: {
      type: Boolean,
      default: false,
    },
    billingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Billing',
      default: null,
    },
    // Prescription link — set when doctor adds a prescription
    hasPrescription: {
      type: Boolean,
      default: false,
    },
    prescriptionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Prescription',
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Appointment', appointmentSchema);
