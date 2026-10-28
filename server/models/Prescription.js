const { Schema, model } = require('mongoose');
module.exports = model('Prescription', new Schema({
  patientId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  doctorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  drugs: [{ _id: false, name: { type: String, required: true }, dose: String, times: [String] }],
  startDate: { type: Date, default: Date.now },
  endDate: Date,
  notes: String,
  status: { type: String, enum: ['active', 'completed', 'cancelled'], default: 'active' },
}, { timestamps: true }));
