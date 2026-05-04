const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');
const { notFound, errorHandler } = require('./middleware/errorMiddleware');
const User = require('./models/User');

// Load env vars
dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads')); // For serving uploaded images

// Request Logger
app.use((req, res, next) => {
  console.log(`[REQUEST] ${req.method} ${req.originalUrl}`);
  next();
});

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
.then(() => console.log('MongoDB Connected'))
.catch(err => console.log('MongoDB Connection Error:', err));

const ensureDefaultAdmin = async () => {
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;
  const adminName = process.env.ADMIN_NAME || 'System Admin';

  if (!adminEmail || !adminPassword) {
    return;
  }

  const existingAdmin = await User.findOne({ email: adminEmail.toLowerCase().trim() });
  if (existingAdmin) {
    return;
  }

  const hashedPassword = await bcrypt.hash(adminPassword, 10);
  await User.create({
    name: adminName,
    email: adminEmail.toLowerCase().trim(),
    password: hashedPassword,
    role: 'admin',
  });

  console.log('Default admin user created from environment variables');
};

mongoose.connection.once('open', async () => {
  try {
    await ensureDefaultAdmin();
  } catch (error) {
    console.log('Admin bootstrap error:', error.message);
  }
});

// Basic Test Route
app.get('/api/test', (req, res) => {
  res.json({ message: 'Backend API is running successfully' });
});

// Import Routes
const doctorRoutes = require('./routes/doctorRoutes');
const authRoutes = require('./routes/authRoutes');
const appointmentRoutes = require('./routes/appointmentRoutes');
const patientRoutes = require('./routes/patientRoutes');
const billingRoutes = require('./routes/billingRoutes');
const prescriptionRoutes = require('./routes/prescriptionRoutes');
const reviewRoutes = require('./routes/reviewRoutes');

app.use('/api/auth', authRoutes);
app.use('/api/doctors', doctorRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/prescriptions', prescriptionRoutes);
app.use('/api/reviews', reviewRoutes);

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
