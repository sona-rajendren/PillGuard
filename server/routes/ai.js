const r = require('express').Router();
const multer = require('multer');
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { protect } = require('../middleware/auth');
const c = require('../controllers/aiController');
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

r.use(protect);
r.post('/identify-pill', upload.single('image'), c.identifyPill);
r.post('/interaction-check', [
  body('existingMeds').isArray().withMessage('existingMeds must be an array'),
  body('newMed').trim().notEmpty().withMessage('newMed required'),
], validate, c.interaction);
module.exports = r;
