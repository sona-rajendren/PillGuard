const Alert = require('../models/Alert');
const { accessibleIds } = require('../middleware/access');

exports.list = async (req, res) => {
  const ids = await accessibleIds(req.user);
  const q = { patientId: { $in: ids } };
  if (req.query.patientId) q.patientId = ids.some((i) => String(i) === req.query.patientId) ? req.query.patientId : { $in: [] };
  if (req.query.acknowledged !== undefined) q.acknowledged = req.query.acknowledged === 'true';
  res.json(await Alert.find(q).populate('patientId', 'name').sort('-createdAt').limit(100));
};

exports.ack = async (req, res) => {
  const a = await Alert.findById(req.params.id);
  if (!a) return res.status(404).json({ message: 'Alert not found' });
  const ids = await accessibleIds(req.user);
  if (!ids.some((i) => String(i) === String(a.patientId))) return res.status(403).json({ message: 'Forbidden' });
  a.acknowledged = true; a.acknowledgedBy = req.user._id;
  await a.save();
  res.json(a);
};
