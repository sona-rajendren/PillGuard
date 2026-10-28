const r = require('express').Router();
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { protect } = require('../middleware/auth');
const c = require('../controllers/authController');

r.post('/register', [
  body('name').trim().isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
  body('email').isEmail().withMessage('Valid email required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('role').isIn(['doctor', 'patient', 'caregiver']).withMessage('Role must be doctor, patient or caregiver'),
], validate, c.register);
r.post('/login', [body('email').isEmail().withMessage('Valid email required'), body('password').notEmpty().withMessage('Password required')], validate, c.login);
r.get('/me', protect, c.me);
module.exports = r;
