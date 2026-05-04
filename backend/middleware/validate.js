/**
 * Central validation runner.
 * Usage: router.post('/path', [...rules], validate, controller)
 *
 * Reads express-validator results and returns a structured error response:
 * { success: false, errors: [{ field, message }] }
 */
const { validationResult } = require('express-validator');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({
      success: false,
      errors: errors.array().map(err => ({
        field: err.path || err.param,
        message: err.msg,
      })),
    });
  }
  next();
};

module.exports = validate;
