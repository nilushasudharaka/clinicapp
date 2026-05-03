const Billing = require('../models/Billing');
const Appointment = require('../models/Appointment');

// ── Admin: Create a new invoice for a completed appointment ──────────────────
exports.createInvoice = async (req, res) => {
  try {
    const { appointmentId, patientId, doctorId, amount, consultationFee, medicineFee, otherCharges } = req.body;

    if (!appointmentId || !patientId || !doctorId) {
      return res.status(400).json({ message: 'appointmentId, patientId, and doctorId are required.' });
    }

    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found.' });
    }
    if (appointment.hasBill) {
      return res.status(400).json({ message: 'A bill already exists for this appointment.' });
    }

    // Compute total — support both simple (amount) and detailed fee breakdown
    const total = amount || ((consultationFee || 0) + (medicineFee || 0) + (otherCharges || 0)) || 1500;

    const invoice = await Billing.create({
      appointmentId,
      patientId,
      doctorId,
      amount: total,
      consultationFee: consultationFee || 0,
      medicineFee: medicineFee || 0,
      otherCharges: otherCharges || 0,
      status: 'Pending',
      isActive: true,
    });

    // Flag the appointment so the patient gets a notification
    await Appointment.findByIdAndUpdate(appointmentId, {
      hasBill: true,
      billingId: invoice._id,
    });

    const populated = await Billing.findById(invoice._id)
      .populate('appointmentId', 'date time status')
      .populate('patientId', 'name email')
      .populate('doctorId', 'name specialization');

    res.status(201).json(populated);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// ── Admin: Get all invoices ──────────────────────────────────────────────────
exports.getAllInvoices = async (req, res) => {
  try {
    const invoices = await Billing.find({ isActive: true })
      .populate('appointmentId', 'date time status')
      .populate('patientId', 'name email')
      .populate('doctorId', 'name specialization')
      .sort({ createdAt: -1 });
    res.json(invoices);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// ── Patient: Get my bills ────────────────────────────────────────────────────
exports.getMyBilling = async (req, res) => {
  try {
    const invoices = await Billing.find({ patientId: req.user._id, isActive: true })
      .populate('appointmentId', 'date time status')
      .populate('doctorId', 'name specialization')
      .sort({ createdAt: -1 });
    res.json(invoices);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// ── Patient/Admin: Get bill by appointment ID ───────────────────────────────
exports.getBillingByAppointment = async (req, res) => {
  try {
    const invoice = await Billing.findOne({ appointmentId: req.params.appointmentId, isActive: true })
      .populate('appointmentId', 'date time status patientName')
      .populate('patientId', 'name email')
      .populate('doctorId', 'name specialization profilePhoto');

    if (!invoice) {
      return res.status(404).json({ message: 'No bill found for this appointment.' });
    }

    // Access check: admin or the specific patient
    if (req.user.role !== 'admin' && invoice.patientId._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json(invoice);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// ── Shared: Get single invoice by ID ────────────────────────────────────────
exports.getInvoiceById = async (req, res) => {
  try {
    const invoice = await Billing.findOne({ _id: req.params.id, isActive: true })
      .populate('appointmentId', 'date time status patientName')
      .populate('patientId', 'name email')
      .populate('doctorId', 'name specialization profilePhoto');

    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    if (req.user.role !== 'admin' && invoice.patientId._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json(invoice);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// ── Admin/Patient: Update payment status ────────────────────────────────────
exports.updatePaymentStatus = async (req, res) => {
  try {
    const { status, paymentMethod } = req.body;

    const invoice = await Billing.findById(req.params.id);
    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    if (status) invoice.status = status;
    if (paymentMethod) invoice.paymentMethod = paymentMethod;
    if (status === 'Paid') invoice.paidAt = new Date();

    await invoice.save();

    const updated = await Billing.findById(invoice._id)
      .populate('appointmentId', 'date time status')
      .populate('patientId', 'name email')
      .populate('doctorId', 'name specialization');

    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// ── Admin: Soft-delete invoice ───────────────────────────────────────────────
exports.deleteInvoice = async (req, res) => {
  try {
    const invoice = await Billing.findById(req.params.id);
    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    invoice.isActive = false;
    invoice.status = 'Cancelled';
    await invoice.save();

    // Clear billing flag on appointment
    if (invoice.appointmentId) {
      await Appointment.findByIdAndUpdate(invoice.appointmentId, { hasBill: false, billingId: null });
    }

    res.json({ message: 'Invoice cancelled successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
