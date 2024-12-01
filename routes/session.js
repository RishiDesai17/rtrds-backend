const express = require('express');
const authenticate = require('../middleware/authenticate');
const Session = require('../models/Session');
const Doctor = require('../models/Doctor');

const router = express.Router();

/**
 * Add a comment to a session.
 * @route POST /api/session/:sessionId/comment
 */
router.post('/:sessionId/comment', authenticate, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { comment } = req.body;

    // Ensure the user is a doctor and is verified
    if (req.user.role !== 'doctor') {
      return res.status(403).json({ message: 'Only doctors can add comments' });
    }

    if (!req.user.verified) {
      return res.status(403).json({ message: 'Doctor is not verified' });
    }

    const doctor = await Doctor.findById(req.user.id);

    const session = await Session.findOneAndUpdate(
      { sessionId },
      { $push: { comments: { doctor: doctor.name, text: comment, timestamp: new Date().toISOString() } } },
      { new: true }
    );

    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    res.status(200).json({ message: 'Comment added successfully', session });
  } catch (err) {
    res.status(500).json({ message: 'Error adding comment', error: err.message });
  }
});

module.exports = router;
