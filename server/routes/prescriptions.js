const r = require('express').Router();
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { protect, allow } = require('../middleware/auth');
const { patientScope } = require('../middleware/access');
const c = require('../controllers/prescriptionController');

const drugRules = [
  body('drugs').isArray({ min: 1 }).withMessage('At least one drug is required'),
  body('drugs.*.name').trim().notEmpty().withMessage('Drug name required'),
  body('drugs.*.times').isArray({ min: 1 }).withMessage('At least one dose time required'),
  body('drugs.*.times.*').matches(/^([01]\d|2[0-3]):[0-5]\d$/).withMessage('Times must be HH:MM (24h)'),
];
r.use(protect);
r.get('/', patientScope, c.list);
r.post('/', allow('doctor'), body('patientId').notEmpty().withMessage('patientId required'), drugRules, validate, patientScope, c.create);
r.put('/:id', allow('doctor'), body('drugs').optional().isArray({ min: 1 }), validate, c.update);
r.delete('/:id', allow('doctor'), c.remove);
module.exports = r;
