const fs = require('fs');
const path = require('path');
const DoseLog = require('../models/DoseLog');
const ai = require('../services/ai');
const AiCheck = require('../models/AiCheck');
const { generateForPatient, dayStart, adherence } = require('../services/doseService');

exports.today = async (req, res) => {
  await generateForPatient(req.patientId);
  const s = dayStart();
  res.json(await DoseLog.find({ patientId: req.patientId, scheduledAt: { $gte: s, $lt: new Date(s.getTime() + 86400000) } }).sort('scheduledAt'));
};

const mine = async (req, res) => {
  const d = await DoseLog.findById(req.params.id);
  if (!d) { res.status(404).json({ message: 'Dose not found' }); return null; }
  if (String(d.patientId) !== String(req.user._id)) { res.status(403).json({ message: 'Not your dose' }); return null; }
  if (d.status === 'taken') { res.status(409).json({ message: 'Dose already confirmed' }); return null; }
  return d;
};

exports.confirm = async (req, res) => {
  const d = await mine(req, res); if (!d) return;
  if (req.file) {
    const name = `${d._id}-${Date.now()}.jpg`;
    fs.writeFileSync(path.join(__dirname, '../uploads', name), req.file.buffer);
    d.photoUrl = `/uploads/${name}`;
    if (ai.enabled()) {
      try {
        const v = await ai.verifyBlister(req.file.buffer, req.file.mimetype, d.drugName);
        d.aiVerified = !!v.verified; d.aiNote = v.note;
        await AiCheck.create({ userId: req.user._id, kind: 'blister', input: { dose: d._id }, result: v });
      } catch (e) { d.aiNote = 'AI verification unavailable'; }
    }
  }
  d.status = 'taken'; d.takenAt = new Date();
  await d.save();
  res.json(d);
};

exports.skip = async (req, res) => {
  const d = await mine(req, res); if (!d) return;
  d.status = 'skipped'; await d.save();
  res.json(d);
};

exports.adherence = async (req, res) => {
  const days = parseInt(req.query.range, 10) || 30;
  res.json(await adherence(req.patientId, Math.min(days, 90)));
};
