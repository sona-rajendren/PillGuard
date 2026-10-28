const { Schema, model } = require('mongoose');
module.exports = model('Alert', new Schema({
  patientId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  type: { type: String, enum: ['missed_dose', 'threshold', 'interaction'], required: true },
  severity: { type: String, enum: ['info', 'warning', 'critical'], default: 'warning' },
  message: { type: String, required: true },
  acknowledged: { type: Boolean, default: false },
  acknowledgedBy: { type: Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true }));
