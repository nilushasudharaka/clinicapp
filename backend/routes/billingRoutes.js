const express = require('express');
const {
  createInvoice,
  getAllInvoices,
  getMyBilling,
  getBillingByAppointment,
  getInvoiceById,
  updatePaymentStatus,
  deleteInvoice,
} = require('../controllers/billingController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

// Patient routes
router.get('/my-billing', protect, authorize('patient'), getMyBilling);
router.get('/by-appointment/:appointmentId', protect, getBillingByAppointment);

// Admin routes (static paths MUST come before parameterized /:id)
router.post('/', protect, authorize('admin'), createInvoice);
router.get('/', protect, authorize('admin'), getAllInvoices);
router.put('/:id/status', protect, updatePaymentStatus);
router.delete('/:id', protect, authorize('admin'), deleteInvoice);

// Shared (Admin + specific Patient — access checked inside controller)
router.get('/:id', protect, getInvoiceById);

module.exports = router;
