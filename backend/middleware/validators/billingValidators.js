const { body } = require('express-validator');

exports.createBillingRules = [
  body('appointmentId')
    .notEmpty().withMessage('Appointment ID is required')
    .isMongoId().withMessage('Invalid appointment ID'),

  body('patientId')
    .notEmpty().withMessage('Patient ID is required')
    .isMongoId().withMessage('Invalid patient ID'),

  body('doctorId')
    .notEmpty().withMessage('Doctor ID is required')
    .isMongoId().withMessage('Invalid doctor ID'),

  body('consultationFee')
    .notEmpty().withMessage('Consultation fee is required')
    .isFloat({ min: 0 }).withMessage('Consultation fee must be 0 or more'),

  body('medicineFee')
    .optional()
    .isFloat({ min: 0 }).withMessage('Medicine fee must be 0 or more'),

  body('otherCharges')
    .optional()
    .isFloat({ min: 0 }).withMessage('Other charges must be 0 or more'),

  body('amount')
    .notEmpty().withMessage('Total amount is required')
    .isFloat({ min: 1 }).withMessage('Total amount must be greater than 0'),
];

exports.updateStatusRules = [
  body('status')
    .notEmpty().withMessage('Payment status is required')
    .isIn(['Pending', 'Paid', 'Cancelled']).withMessage('Status must be Pending, Paid, or Cancelled'),

  body('paymentMethod')
    .optional()
    .isIn(['Cash', 'Card', 'Online']).withMessage('Payment method must be Cash, Card, or Online'),
];
