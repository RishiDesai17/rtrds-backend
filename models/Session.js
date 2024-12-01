const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
  sessionId: { type: String, required: true, unique: true },
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
  heartMetrics: [{ type: Number }],
  breathMetrics: [{ type: Number }],
  comments: [{
    doctor: String,
    text: String,
    timestamp: String
  }],
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Session', sessionSchema);
