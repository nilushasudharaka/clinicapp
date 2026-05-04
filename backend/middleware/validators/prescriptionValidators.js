const { body } = require('express-validator');

exports.createPrescriptionRules = [
  body('appointmentId')
    .notEmpty().withMessage('Appointment ID is required')
    .isMongoId().withMessage('Invalid appointment ID'),

  body('medications')
    .isArray({ min: 1 }).withMessage('At least one medication is required'),

  body('medications.*.name')
    .trim()
    .notEmpty().withMessage('Medicine name is required'),

  body('medications.*.dosage')
    .trim()
    .notEmpty().withMessage('Dosage is required for each medicine'),

  body('medications.*.frequency')
    .trim()
    .notEmpty().withMessage('Frequency is required for each medicine'),

  body('medications.*.duration')
    .trim()
    .notEmpty().withMessage('Duration is required for each medicine'),

  body('instructions')
    .optional()
    .isString().withMessage('Instructions must be text'),
];
