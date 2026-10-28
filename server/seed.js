// Demo data: doctor, patient, caregiver + 14 days of history. Password for all: password123
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const User = require('./models/User'), PatientProfile = require('./models/PatientProfile'), Prescription = require('./models/Prescription');
const DoseLog = require('./models/DoseLog'), Vital = require('./models/Vital'), Alert = require('./models/Alert');

(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  await Promise.all([User, PatientProfile, Prescription, DoseLog, Vital, Alert].map((m) => m.deleteMany({})));
  const passwordHash = await bcrypt.hash('password123', 10);
  const [doc, pat, care] = await User.create([
    { name: 'Dr. Meera Rao', email: 'doctor@demo.com', role: 'doctor', passwordHash },
    { name: 'Ramesh Kumar', email: 'patient@demo.com', role: 'patient', passwordHash },
    { name: 'Anita Kumar', email: 'caregiver@demo.com', role: 'caregiver', passwordHash },
  ]);
  await PatientProfile.create({ userId: pat._id, age: 68, conditions: ['Type 2 Diabetes', 'Hypertension'], doctorId: doc._id, caregiverIds: [care._id] });
  const rx = await Prescription.create({ patientId: pat._id, doctorId: doc._id, startDate: new Date(Date.now() - 20 * 86400000),
    drugs: [{ name: 'Metformin', dose: '500 mg', times: ['08:00', '20:00'] }, { name: 'Amlodipine', dose: '5 mg', times: ['09:00'] }] });
  const logs = [];
  for (let d = 14; d >= 1; d--) for (const [n, dose, t] of [['Metformin', '500 mg', 8], ['Metformin', '500 mg', 20], ['Amlodipine', '5 mg', 9]]) {
    const at = new Date(); at.setDate(at.getDate() - d); at.setHours(t, 0, 0, 0);
    const taken = Math.random() < 0.8;
    logs.push({ patientId: pat._id, prescriptionId: rx._id, drugName: n, dose, scheduledAt: at, status: taken ? 'taken' : 'missed', takenAt: taken ? at : undefined });
  }
  await DoseLog.insertMany(logs);
  const vit = [];
  for (let d = 14; d >= 0; d--) {
    const at = new Date(Date.now() - d * 86400000);
    vit.push({ patientId: pat._id, type: 'glucose', value: 110 + Math.round(Math.random() * 90), recordedAt: at });
    vit.push({ patientId: pat._id, type: 'bp', systolic: 120 + Math.round(Math.random() * 45), diastolic: 78 + Math.round(Math.random() * 25), recordedAt: at });
  }
  await Vital.insertMany(vit);
  console.log('Seeded. Logins: doctor@demo.com / patient@demo.com / caregiver@demo.com  (password123)');
  process.exit(0);
})();
