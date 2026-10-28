const { Schema, model } = require('mongoose');
const ref = { type: Schema.Types.ObjectId, ref: 'User' };
module.exports = model('PatientProfile', new Schema({
  userId: { ...ref, required: true, unique: true },
  age: Number,
  conditions: [String],
  doctorId: ref,
  caregiverIds: [ref],
  thresholds: {
    glucoseMin: { type: Number, default: 70 },
    glucoseMax: { type: Number, default: 180 },
    sysMax: { type: Number, default: 160 },
    diaMax: { type: Number, default: 100 },
  },
}, { timestamps: true }));
