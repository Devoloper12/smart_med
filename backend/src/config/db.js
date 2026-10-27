const mongoose = require('mongoose');

let isConnected = false;

const connectDB = async () => {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/smart_medicine_db';

  try {
    mongoose.set('strictQuery', false);

    console.log(`Connecting to MongoDB at: ${uri.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')}`);

    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    isConnected = true;
    console.log(`\x1b[32m✔ MongoDB Atlas / Database Connected: ${conn.connection.host} (${conn.connection.name})\x1b[0m`);
    return conn;
  } catch (error) {
    isConnected = false;
    console.warn(`\x1b[33m⚠ MongoDB Connection Notice: Could not connect to MongoDB server.\x1b[0m`);
    console.warn(`Reason: ${error.message}`);
    console.warn(`Tip: For Render / Atlas deployment, set MONGODB_URI in Render Environment variables.`);
    return null;
  }
};

const getDBStatus = () => ({
  isConnected: mongoose.connection.readyState === 1,
  readyState: mongoose.connection.readyState,
  host: mongoose.connection.host || 'Disconnected',
  name: mongoose.connection.name || 'None'
});

module.exports = { connectDB, getDBStatus };
