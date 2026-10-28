const r = require('express').Router();
const multer = require('multer');
const { protect, allow } = require('../middleware/auth');
const { patientScope } = require('../middleware/access');
const c = require('../controllers/doseController');
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

r.use(protect);
r.get('/today', patientScope, c.today);
r.get('/adherence/:patientId', patientScope, c.adherence);
r.post('/:id/confirm', allow('patient'), upload.single('photo'), c.confirm);
r.post('/:id/skip', allow('patient'), c.skip);
module.exports = r;
