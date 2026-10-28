const Vital = require('../models/Vital');
const Alert = require('../models/Alert');
const PatientProfile = require('../models/PatientProfile');

exports.create = async (req, res) => {
  const { type, value, systolic, diastolic, recordedAt } = req.body;
  const v = await Vital.create({ patientId: req.user._id, type, value, systolic, diastolic, recordedAt });
  const t = (await PatientProfile.findOne({ userId: req.user._id }))?.thresholds;
  let msg = null, sev = 'warning';
  if (t && type === 'glucose') {
    if (value > t.glucoseMax) { msg = `High glucose: ${value} mg/dL (limit ${t.glucoseMax})`; if (value > t.glucoseMax * 1.5) sev = 'critical'; }
    if (value < t.glucoseMin) { msg = `Low glucose: ${value} mg/dL (limit ${t.glucoseMin})`; sev = 'critical'; }
  }
  if (t && type === 'bp' && (systolic > t.sysMax || diastolic > t.diaMax)) {
    msg = `High BP: ${systolic}/${diastolic} mmHg (limit ${t.sysMax}/${t.diaMax})`;
    if (systolic > t.sysMax + 40) sev = 'critical';
  }
  let alert = null;
  if (msg) alert = await Alert.create({ patientId: req.user._id, type: 'threshold', severity: sev, message: `${req.user.name}: ${msg}` });
  res.status(201).json({ vital: v, alert });
};

exports.list = async (req, res) => {
  const q = { patientId: req.patientId, recordedAt: { $gte: new Date(Date.now() - (parseInt(req.query.days, 10) || 30) * 86400000) } };
  if (req.query.type) q.type = req.query.type;
  res.json(await Vital.find(q).sort('recordedAt'));
};
