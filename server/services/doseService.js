const Prescription = require('../models/Prescription');
const DoseLog = require('../models/DoseLog');

const dayStart = (d = new Date()) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
exports.dayStart = dayStart;

// Lazily creates today's pending dose rows from active prescriptions (idempotent)
exports.generateForPatient = async (patientId, day = new Date()) => {
  const start = dayStart(day);
  const end = new Date(start.getTime() + 86400000);
  const rxs = await Prescription.find({
    patientId, status: 'active', startDate: { $lt: end },
    $or: [{ endDate: null }, { endDate: { $exists: false } }, { endDate: { $gte: start } }],
  });
  for (const rx of rxs) for (const drug of rx.drugs) for (const t of drug.times) {
    const [h, m] = t.split(':').map(Number);
    const at = new Date(start); at.setHours(h, m, 0, 0);
    try {
      await DoseLog.updateOne(
        { patientId, prescriptionId: rx._id, drugName: drug.name, scheduledAt: at },
        { $setOnInsert: { status: 'pending', dose: drug.dose } }, { upsert: true });
    } catch (e) { if (e.code !== 11000) throw e; }
  }
};

// Per-day taken/missed/skipped counts + overall adherence percent
exports.adherence = async (patientId, days = 30) => {
  const from = dayStart(new Date(Date.now() - (days - 1) * 86400000));
  const logs = await DoseLog.find({ patientId, scheduledAt: { $gte: from }, status: { $ne: 'pending' } });
  const map = {};
  for (let i = 0; i < days; i++) {
    const d = new Date(from.getTime() + i * 86400000).toLocaleDateString('en-CA');
    map[d] = { date: d, taken: 0, missed: 0, skipped: 0 };
  }
  logs.forEach((l) => { const k = l.scheduledAt.toLocaleDateString('en-CA'); if (map[k]) map[k][l.status]++; });
  const arr = Object.values(map);
  const t = arr.reduce((a, d) => a + d.taken, 0);
  const total = arr.reduce((a, d) => a + d.taken + d.missed + d.skipped, 0);
  return { days: arr, percent: total ? Math.round((t / total) * 100) : null };
};
