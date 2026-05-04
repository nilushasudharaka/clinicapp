const { body } = require('express-validator');

exports.createAppointmentRules = [
  body('doctorId')
    .notEmpty().withMessage('Doctor is required')
    .isMongoId().withMessage('Invalid doctor ID'),

  body('patientName')
    .trim()
    .notEmpty().withMessage('Patient name is required')
    .isLength({ min: 2 }).withMessage('Patient name must be at least 2 characters'),

  body('date')
    .notEmpty().withMessage('Appointment date is required')
    .isISO8601().withMessage('Date must be a valid ISO date'),

  body('time')
    .trim()
    .notEmpty().withMessage('Appointment time is required'),

  body('patientPhone')
    .optional()
    .matches(/^(\+94|0)[0-9]{9}$/).withMessage('Enter a valid Sri Lankan phone number'),

  body('description')
    .optional()
    .isString().withMessage('Description must be text'),
];

exports.updateStatusRules = [
  body('status')
    .notEmpty().withMessage('Status is required')
    .isIn(['Pending', 'Confirmed', 'Completed', 'Cancelled'])
    .withMessage('Status must be Pending, Confirmed, Completed, or Cancelled'),
];

exports.rescheduleRules = [
  body('rescheduleDate')
    .notEmpty().withMessage('New date is required')
    .isISO8601().withMessage('Date must be a valid ISO date'),

  body('rescheduleTime')
    .trim()
    .notEmpty().withMessage('New time is required'),

  body('reason')
    .trim()
    .notEmpty().withMessage('Reason for reschedule is required')
    .isLength({ min: 5 }).withMessage('Reason must be at least 5 characters'),
];
