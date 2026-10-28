const r = require('express').Router();
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { protect, allow } = require('../middleware/auth');
const { patientScope } = require('../middleware/access');
const c = require('../controllers/vitalController');

r.use(protect);
r.post('/', allow('patient'), [
  body('type').isIn(['glucose', 'bp']).withMessage('type must be glucose or bp'),
  body('value').if(body('type').equals('glucose')).isFloat({ min: 20, max: 700 }).withMessage('Glucose must be 20-700 mg/dL'),
  body('systolic').if(body('type').equals('bp')).isInt({ min: 60, max: 260 }).withMessage('Systolic must be 60-260'),
  body('diastolic').if(body('type').equals('bp')).isInt({ min: 30, max: 160 }).withMessage('Diastolic must be 30-160'),
], validate, c.create);
r.get('/:patientId', patientScope, c.list);
module.exports = r;
