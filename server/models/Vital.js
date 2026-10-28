const { Schema, model } = require('mongoose');
module.exports = model('Vital', new Schema({
  patientId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  type: { type: String, enum: ['glucose', 'bp'], required: true },
  value: Number,
  systolic: Number,
  diastolic: Number,
  recordedAt: { type: Date, default: Date.now },
}));
