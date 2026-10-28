const User = require('../models/User');
const PatientProfile = require('../models/PatientProfile');
const Alert = require('../models/Alert');
const { accessibleIds } = require('../middleware/access');
const { adherence } = require('../services/doseService');

exports.list = async (req, res) => {
  const ids = await accessibleIds(req.user);
  const profiles = await PatientProfile.find({ userId: { $in: ids } }).populate('userId', 'name email');
  res.json(await Promise.all(profiles.map(async (p) => ({
    _id: p.userId._id, name: p.userId.name, email: p.userId.email,
    profile: { age: p.age, conditions: p.conditions, thresholds: p.thresholds },
    adherence: (await adherence(p.userId._id, 7)).percent,
    openAlerts: await Alert.countDocuments({ patientId: p.userId._id, acknowledged: false }),
  }))));
};

exports.one = async (req, res) => {
  const p = await PatientProfile.findOne({ userId: req.patientId })
    .populate('userId', 'name email').populate('caregiverIds', 'name email').populate('doctorId', 'name email');
  if (!p) return res.status(404).json({ message: 'Patient not found' });
  res.json({ _id: p.userId._id, name: p.userId.name, email: p.userId.email, age: p.age, conditions: p.conditions,
    thresholds: p.thresholds, doctor: p.doctorId, caregivers: p.caregiverIds });
};

exports.addCaregiver = async (req, res) => {
  const c = await User.findOne({ email: req.body.email.toLowerCase(), role: 'caregiver' });
  if (!c) return res.status(404).json({ message: 'No caregiver account with that email' });
  await PatientProfile.updateOne({ userId: req.patientId }, { $addToSet: { caregiverIds: c._id } });
  res.json({ message: 'Caregiver linked', caregiver: { _id: c._id, name: c.name, email: c.email } });
};

exports.setThresholds = async (req, res) => {
  const { glucoseMin, glucoseMax, sysMax, diaMax } = req.body;
  const t = {};
  Object.entries({ glucoseMin, glucoseMax, sysMax, diaMax }).forEach(([k, v]) => { if (v !== undefined) t[`thresholds.${k}`] = v; });
  const p = await PatientProfile.findOneAndUpdate({ userId: req.patientId }, { $set: t }, { new: true });
  res.json(p.thresholds);
};
