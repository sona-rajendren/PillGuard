const ai = require('../services/ai');
const AiCheck = require('../models/AiCheck');
const Prescription = require('../models/Prescription');

exports.interaction = async (req, res) => {
  const { existingMeds, newMed } = req.body;
  const result = await ai.interactionCheck(existingMeds, newMed);
  await AiCheck.create({ userId: req.user._id, kind: 'interaction', input: { existingMeds, newMed }, result });
  res.json(result);
};

exports.identifyPill = async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'Image is required (field "image")' });
  if (!ai.enabled()) return res.status(503).json({ message: 'AI is not configured on the server (set ANTHROPIC_API_KEY)' });
  const pid = req.user.role === 'patient' ? req.user._id : req.body.patientId;
  const rxs = pid ? await Prescription.find({ patientId: pid, status: 'active' }) : [];
  const prescribed = rxs.flatMap((r) => r.drugs.map((d) => d.name));
  const result = await ai.identifyPill(req.file.buffer, req.file.mimetype, prescribed);
  await AiCheck.create({ userId: req.user._id, kind: 'pill_id', input: { prescribed }, result });
  res.json(result);
};
