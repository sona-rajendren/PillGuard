const { Schema, model } = require('mongoose');
module.exports = model('AiCheck', new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  kind: { type: String, enum: ['pill_id', 'interaction', 'blister'], required: true },
  input: Schema.Types.Mixed,
  result: Schema.Types.Mixed,
}, { timestamps: true }));
