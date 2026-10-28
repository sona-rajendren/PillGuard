const r = require('express').Router();
const { protect } = require('../middleware/auth');
const c = require('../controllers/alertController');
r.use(protect);
r.get('/', c.list);
r.put('/:id/ack', c.ack);
module.exports = r;
