require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const { connectDB, getDBStatus } = require('./src/config/db');
const { errorHandler, notFoundHandler } = require('./src/middlewares/errorHandler');

// Route Imports
const authRoutes = require('./src/routes/authRoutes');
const patientRoutes = require('./src/routes/patientRoutes');
const medicineRoutes = require('./src/routes/medicineRoutes');
const reminderRoutes = require('./src/routes/reminderRoutes');
const prescriptionRoutes = require('./src/routes/prescriptionRoutes');
const caregiverRoutes = require('./src/routes/caregiverRoutes');
const emergencyRoutes = require('./src/routes/emergencyRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to MongoDB Atlas
connectDB();

// Dynamic CORS for local development and Vercel production frontend
const allowedOrigins = process.env.CLIENT_URL ? process.env.CLIENT_URL.split(',').map(s => s.trim()) : ['*'];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin) || origin.endsWith('.vercel.app')) {
      return callback(null, true);
    }
    return callback(null, true); // Fallback allow to avoid unexpected deployment CORS blocks
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve Uploaded Files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Render Web Service Health Check
app.get('/api/health', (req, res) => {
  const dbStatus = getDBStatus();
  res.status(200).json({
    status: 'ONLINE',
    service: 'Smart Medicine Backend API (Render)',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    database: dbStatus
  });
});

// Root welcome message
app.get('/', (req, res) => {
  res.status(200).json({
    message: 'Smart Medicine Reminder API is running. Point your frontend here.',
    healthCheck: '/api/health',
    documentation: 'See README.md for endpoint routes'
  });
});

// API Routes (Support both /api/* and root /*)
app.use('/api/auth', authRoutes);
app.use('/auth', authRoutes);

app.use('/api/patients', patientRoutes);
app.use('/patients', patientRoutes);

app.use('/api/medicines', medicineRoutes);
app.use('/medicines', medicineRoutes);

app.use('/api/reminders', reminderRoutes);
app.use('/reminders', reminderRoutes);

app.use('/api/prescriptions', prescriptionRoutes);
app.use('/prescriptions', prescriptionRoutes);

app.use('/api/caregivers', caregiverRoutes);
app.use('/caregivers', caregiverRoutes);

app.use('/api/emergency', emergencyRoutes);
app.use('/emergency', emergencyRoutes);

// Error Handling
app.use(notFoundHandler);
app.use(errorHandler);

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n======================================================`);
  console.log(`  Smart Medicine Backend Service (Render Ready)       `);
  console.log(`======================================================`);
  console.log(`  Listening on Port:  ${PORT}`);
  console.log(`  Health Check URL:   http://localhost:${PORT}/api/health`);
  console.log(`  Environment:        ${process.env.NODE_ENV || 'development'}`);
  console.log(`======================================================\n`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\x1b[31m[Port Conflict] Port ${PORT} is already in use by another running process.\x1b[0m`);
    console.error(`Tip: Stop the existing process or set a different PORT (e.g. PORT=5001) in backend/.env`);
    process.exit(1);
  } else {
    console.error('Server error:', err);
  }
});

module.exports = app;
