const cron = require('node-cron');
const DoseLog = require('../models/DoseLog');
const Prescription = require('../models/Prescription');
const Alert = require('../models/Alert');
const User = require('../models/User');
const { generateForPatient } = require('./doseService');

// Every 5 min: make sure today's doses exist, then mark overdue ones as missed + alert
exports.start = () => cron.schedule('*/5 * * * *', async () => {
  try {
    const patients = await Prescription.distinct('patientId', { status: 'active' });
    for (const p of patients) await generateForPatient(p);
    const grace = (parseInt(process.env.MISSED_GRACE_MIN, 10) || 30) * 60000;
    const overdue = await DoseLog.find({ status: 'pending', scheduledAt: { $lt: new Date(Date.now() - grace) } });
    for (const d of overdue) {
      d.status = 'missed'; await d.save();
      const u = await User.findById(d.patientId).select('name');
      await Alert.create({ patientId: d.patientId, type: 'missed_dose', severity: 'warning',
        message: `${u?.name || 'Patient'} missed ${d.drugName} (scheduled ${d.scheduledAt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })})` });
    }
    if (overdue.length) console.log(`[cron] marked ${overdue.length} dose(s) missed`);
  } catch (e) { console.error('[cron]', e.message); }
});
