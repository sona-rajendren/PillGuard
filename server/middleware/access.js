const PatientProfile = require('../models/PatientProfile');

// Patient ids a user may see: self (patient), assigned patients (doctor), linked patients (caregiver)
const accessibleIds = async (u) => {
  if (u.role === 'patient') return [u._id];
  const q = u.role === 'doctor' ? { doctorId: u._id } : { caregiverIds: u._id };
  return (await PatientProfile.find(q).select('userId')).map((p) => p.userId);
};
exports.accessibleIds = accessibleIds;

// Resolves + authorizes the target patient, sets req.patientId
exports.patientScope = async (req, res, next) => {
  const pid = req.params.patientId || req.query.patientId || req.body.patientId ||
    (req.user.role === 'patient' ? String(req.user._id) : null);
  if (!pid) return res.status(400).json({ message: 'patientId is required' });
  if (!/^[a-f\d]{24}$/i.test(pid)) return res.status(400).json({ message: 'Invalid patientId' });
  const ok = (await accessibleIds(req.user)).some((i) => String(i) === String(pid));
  if (!ok) return res.status(403).json({ message: 'You do not have access to this patient' });
  req.patientId = pid;
  next();
};
