const { check } = require('express-validator');

exports.validateSignup = [
  check('email').isEmail().withMessage('Must be a valid email'),
  check('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
];

exports.validateLogin = [
  check('email').isEmail().withMessage('Must be a valid email'),
  check('password').exists().withMessage('Password is required')
];
