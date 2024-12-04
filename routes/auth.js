const express = require('express');
const jwt = require('jsonwebtoken');
const Patient = require('../models/Patient');
const Doctor = require('../models/Doctor');
const router = express.Router();

// Register Patient
router.post('/register/patient', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const existingPatient = await Patient.findOne({ email });
    if (existingPatient) return res.status(400).json({ message: 'Patient already exists' });

    const patient = new Patient({ name, email, password });
    await patient.save();
    res.status(201).json({ message: 'Patient registered successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Error registering patient', error: err.message });
  }
});

// Register Doctor
router.post('/register/doctor', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const existingDoctor = await Doctor.findOne({ email });
    if (existingDoctor) return res.status(400).json({ message: 'Doctor already exists' });

    const doctor = new Doctor({ name, email, password });
    await doctor.save();
    res.status(201).json({ message: 'Doctor registered successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Error registering doctor', error: err.message });
  }
});

// Login Patient
router.post('/login/patient', async (req, res) => {
  try {
    const { username, password } = req.body;
    const patient = await Patient.findOne({ username });
    if (!patient) return res.status(400).json({ message: 'Invalid email or password' });

    const isMatch = await patient.comparePassword(password);
    if (!isMatch) return res.status(400).json({ message: 'Invalid email or password' });

    const token = jwt.sign({ id: patient._id, role: 'patient' }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.status(200).json({ token, patient });
  } catch (err) {
    res.status(500).json({ message: 'Error logging in patient', error: err.message });
  }
});

// Login Doctor
router.post('/login/doctor', async (req, res) => {
  try {
    const { email, password } = req.body;
    const doctor = await Doctor.findOne({ email });
    if (!doctor) return res.status(400).json({ message: 'Invalid email or password' });

    const isMatch = await doctor.comparePassword(password);
    if (!isMatch) return res.status(400).json({ message: 'Invalid email or password' });

    if (!doctor.verified) {
        return res.status(403).json({ message: 'Your account has not yet been verified' });
    }

    const token = jwt.sign({ id: doctor._id, role: 'doctor', verified: doctor.verified }, process.env.JWT_SECRET, { expiresIn: '1y' });
    res.status(200).json({ token, doctor });
  } catch (err) {
    res.status(500).json({ message: 'Error logging in doctor', error: err.message });
  }
});

module.exports = router;
