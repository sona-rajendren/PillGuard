const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const PatientProfile = require('../models/PatientProfile');

const sign = (u) => jwt.sign({ id: u._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
const pub = (u) => ({ _id: u._id, name: u.name, email: u.email, role: u.role });

exports.register = async (req, res) => {
  const { name, email, password, role, doctorEmail, age, conditions } = req.body;
  if (await User.findOne({ email: email.toLowerCase() })) return res.status(409).json({ message: 'Email already registered' });
  let doctor = null;
  if (role === 'patient' && doctorEmail) {
    doctor = await User.findOne({ email: doctorEmail.toLowerCase(), role: 'doctor' });
    if (!doctor) return res.status(400).json({ message: 'No doctor found with that email' });
  }
  const u = await User.create({ name, email, role, passwordHash: await bcrypt.hash(password, 10) });
  if (role === 'patient') await PatientProfile.create({ userId: u._id, age, conditions: conditions || [], doctorId: doctor?._id });
  res.status(201).json({ token: sign(u), user: pub(u) });
};

exports.login = async (req, res) => {
  const u = await User.findOne({ email: req.body.email.toLowerCase() }).select('+passwordHash');
  if (!u || !(await bcrypt.compare(req.body.password, u.passwordHash)))
    return res.status(401).json({ message: 'Invalid email or password' });
  res.json({ token: sign(u), user: pub(u) });
};

exports.me = (req, res) => res.json(pub(req.user));
