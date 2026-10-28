const { Schema, model } = require('mongoose');
const s = new Schema({
  patientId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  prescriptionId: { type: Schema.Types.ObjectId, ref: 'Prescription', required: true },
  drugName: { type: String, required: true },
  dose: String,
  scheduledAt: { type: Date, required: true },
  takenAt: Date,
  status: { type: String, enum: ['pending', 'taken', 'missed', 'skipped'], default: 'pending' },
  photoUrl: String,
  aiVerified: Boolean,
  aiNote: String,
}, { timestamps: true });
s.index({ patientId: 1, prescriptionId: 1, drugName: 1, scheduledAt: 1 }, { unique: true });
module.exports = model('DoseLog', s);
