const { body } = require('express-validator');

exports.patientProfileRules = [
  body('dateOfBirth')
    .notEmpty().withMessage('Date of Birth is required')
    .isISO8601().withMessage('Please provide a valid date (YYYY-MM-DD)'),
  
  body('gender')
    .notEmpty().withMessage('Gender is required')
    .isIn(['Male', 'Female', 'Other']).withMessage('Invalid gender value'),
  
  body('bloodGroup')
    .optional({ checkFalsy: true })
    .matches(/^(A|B|AB|O)[+-]$/).withMessage('Please provide a valid blood group (e.g., O+, A-)'),
  
  body('address')
    .notEmpty().withMessage('Address is required')
    .isLength({ min: 5 }).withMessage('Address must be at least 5 characters long'),
  
  body('emergencyContact')
    .notEmpty().withMessage('Emergency contact information is required')
    .custom((value) => {
      // In multipart form data, objects might come as JSON strings
      const contact = typeof value === 'string' ? JSON.parse(value) : value;
      if (!contact.name || contact.name.trim().length < 2) {
        throw new Error('Emergency contact name is required');
      }
      if (!contact.phone || !/^\d{10}$/.test(contact.phone)) {
        throw new Error('Emergency contact phone must be a valid 10-digit number');
      }
      return true;
    }),
];
