const r = require('express').Router();
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { protect, allow } = require('../middleware/auth');
const { patientScope } = require('../middleware/access');
const c = require('../controllers/patientController');

r.use(protect);
r.get('/', c.list);
r.get('/:patientId', patientScope, c.one);
r.post('/:patientId/caregivers', allow('patient', 'doctor'), patientScope, body('email').isEmail().withMessage('Valid caregiver email required'), validate, c.addCaregiver);
r.put('/:patientId/thresholds', allow('doctor'), patientScope, [
  body('glucoseMin').optional().isFloat({ min: 20, max: 200 }), body('glucoseMax').optional().isFloat({ min: 80, max: 600 }),
  body('sysMax').optional().isFloat({ min: 90, max: 250 }), body('diaMax').optional().isFloat({ min: 60, max: 150 }),
], validate, c.setThresholds);
module.exports = r;
