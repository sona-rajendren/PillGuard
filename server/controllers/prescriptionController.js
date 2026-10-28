const Prescription = require('../models/Prescription');
const DoseLog = require('../models/DoseLog');
const Alert = require('../models/Alert');
const ai = require('../services/ai');

exports.list = async (req, res) => {
  res.json(await Prescription.find({ patientId: req.patientId }).sort('-createdAt'));
};

exports.create = async (req, res) => {
  const { drugs, startDate, endDate, notes } = req.body;
  const existing = await Prescription.find({ patientId: req.patientId, status: 'active' });
  const rx = await Prescription.create({ patientId: req.patientId, doctorId: req.user._id, drugs, startDate, endDate, notes });

  // Auto interaction screening of each new drug vs. current active meds
  let interaction = null;
  try {
    const current = existing.flatMap((e) => e.drugs.map((d) => d.name));
    for (const d of drugs) {
      if (!current.length) break;
      const r = await ai.interactionCheck(current, d.name);
      if (['moderate', 'major'].includes(r.severity)) {
        interaction = r;
        await Alert.create({ patientId: req.patientId, type: 'interaction', severity: r.severity === 'major' ? 'critical' : 'warning',
          message: `Possible interaction for ${d.name}: ${r.summary}` });
      }
    }
  } catch (e) { console.warn('interaction screening skipped:', e.message); }
  res.status(201).json({ prescription: rx, interaction });
};

const own = async (req, res) => {
  const rx = await Prescription.findById(req.params.id);
  if (!rx) { res.status(404).json({ message: 'Prescription not found' }); return null; }
  if (String(rx.doctorId) !== String(req.user._id)) { res.status(403).json({ message: 'Only the issuing doctor can modify this' }); return null; }
  return rx;
};

exports.update = async (req, res) => {
  const rx = await own(req, res); if (!rx) return;
  ['drugs', 'endDate', 'notes', 'status'].forEach((k) => { if (req.body[k] !== undefined) rx[k] = req.body[k]; });
  await rx.save();
  res.json(rx);
};

exports.remove = async (req, res) => {
  const rx = await own(req, res); if (!rx) return;
  await DoseLog.deleteMany({ prescriptionId: rx._id, status: 'pending' });
  await rx.deleteOne();
  res.json({ message: 'Deleted' });
};
