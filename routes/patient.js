const express = require('express');
const authenticate = require('../middleware/authenticate');
const Patient = require('../models/Patient');
const Session = require('../models/Session');

const router = express.Router();
const activeStreams = new Map(); // Store active streaming patients in memory

/**
 * View all patients.
 * @route GET /api/patient
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const patients = await Patient.find();

    const enrichedPatients = await Promise.all(
      patients.map(async (patient) => {
        const session = await Session.findOne({ patientId: patient._id });
        const isStreaming = activeStreams.has(patient._id.toString());
        return {
          ...patient.toObject(),
          currentSession: session ? session.sessionId : null,
          isStreaming,
        };
      })
    );

    res.status(200).json({ patients: enrichedPatients });
  } catch (err) {
    res.status(500).json({ message: 'Error fetching patients', error: err.message });
  }
});

module.exports = { router, activeStreams };
