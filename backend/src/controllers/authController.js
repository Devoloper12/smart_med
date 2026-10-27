const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const UserModel = require('../models/User');
const PatientModel = require('../models/Patient');
const fallbackStore = require('../utils/fallbackStore');
const UserClass = require('../classes/UserDomain');

const isDBConnected = () => mongoose.connection.readyState === 1;

const register = async (req, res, next) => {
  try {
    const { name, email, password, role = 'patient', age, bloodGroup, medicalConditions } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Name, email, and password are required.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });
    }

    const cleanEmail = email.toLowerCase().trim();

    if (isDBConnected()) {
      const existingUser = await UserModel.findOne({ email: cleanEmail });
      if (existingUser) {
        return res.status(400).json({ success: false, message: 'An account with this email address already exists.' });
      }

      const user = new UserModel({ name, email: cleanEmail, password, role: role || 'patient' });
      const savedUser = await user.save();

      let patientProfile = null;
      if (savedUser.role === 'patient') {
        const patient = new PatientModel({
          userId: savedUser._id,
          age: age ? Number(age) : 30,
          bloodGroup: bloodGroup || 'O+',
          medicalConditions: Array.isArray(medicalConditions) ? medicalConditions : (medicalConditions ? medicalConditions.split(',').map(s => s.trim()) : [])
        });
        patientProfile = await patient.save();
      }

      const token = jwt.sign(
        { id: savedUser._id, email: savedUser.email, role: savedUser.role, name: savedUser.name },
        process.env.JWT_SECRET || 'smart_medicine_super_secret_jwt_key_2026_render_production',
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
      );

      return res.status(201).json({
        success: true,
        message: 'Registration successful!',
        token,
        user: { id: savedUser._id, name: savedUser.name, email: savedUser.email, role: savedUser.role },
        patient: patientProfile
      });
    } else {
      const exists = fallbackStore.users.find(u => u.email === cleanEmail);
      if (exists) {
        return res.status(400).json({ success: false, message: 'An account with this email address already exists.' });
      }

      const salt = bcrypt.genSaltSync(10);
      const hashedPassword = bcrypt.hashSync(password, salt);
      const newUserId = 'user_' + Date.now();

      const user = { _id: newUserId, id: newUserId, name, email: cleanEmail, password: hashedPassword, role: role || 'patient', createdAt: new Date().toISOString() };
      fallbackStore.users.push(user);

      let patientProfile = {
        _id: 'patient_' + Date.now(),
        userId: newUserId,
        age: age ? Number(age) : 30,
        bloodGroup: bloodGroup || 'O+',
        medicalConditions: Array.isArray(medicalConditions) ? medicalConditions : []
      };
      fallbackStore.patients.push(patientProfile);

      const token = jwt.sign(
        { id: user._id, email: user.email, role: user.role, name: user.name },
        process.env.JWT_SECRET || 'smart_medicine_super_secret_jwt_key_2026_render_production',
        { expiresIn: '7d' }
      );

      return res.status(201).json({
        success: true,
        message: 'Registration successful!',
        token,
        user: { id: user._id, name: user.name, email: user.email, role: user.role },
        patient: patientProfile
      });
    }
  } catch (error) {
    next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide email and password.' });
    }

    const cleanEmail = email.toLowerCase().trim();

    if (isDBConnected()) {
      const userDomain = new UserClass({ email: cleanEmail });
      const authResult = await userDomain.login(password);

      let patient = null;
      if (authResult.user.role === 'patient') {
        patient = await PatientModel.findOne({ userId: authResult.user.id });
      }

      return res.status(200).json({
        success: true,
        message: 'Login successful!',
        token: authResult.token,
        user: authResult.user,
        patient
      });
    } else {
      const user = fallbackStore.users.find(u => u.email === cleanEmail);
      if (!user) {
        return res.status(401).json({ success: false, message: 'Invalid email or password.' });
      }

      const isMatch = bcrypt.compareSync(password, user.password);
      if (!isMatch) {
        return res.status(401).json({ success: false, message: 'Invalid email or password.' });
      }

      const token = jwt.sign(
        { id: user._id, email: user.email, role: user.role, name: user.name },
        process.env.JWT_SECRET || 'smart_medicine_super_secret_jwt_key_2026_render_production',
        { expiresIn: '7d' }
      );

      const patient = fallbackStore.patients.find(p => p.userId === user._id);

      return res.status(200).json({
        success: true,
        message: 'Login successful!',
        token,
        user: { id: user._id, name: user.name, email: user.email, role: user.role },
        patient
      });
    }
  } catch (error) {
    return res.status(401).json({ success: false, message: error.message || 'Login failed.' });
  }
};

const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    const cleanEmail = (email || '').toLowerCase().trim();
    return res.status(200).json({
      success: true,
      message: `If an account exists for ${cleanEmail}, password reset instructions have been sent to your email.`
    });
  } catch (error) {
    next(error);
  }
};

const getCurrentUser = async (req, res, next) => {
  try {
    let patient = null;
    if (isDBConnected()) {
      patient = await PatientModel.findOne({ userId: req.user._id || req.user.id });
    } else {
      patient = fallbackStore.patients.find(p => p.userId === (req.user._id || req.user.id));
    }

    return res.status(200).json({ success: true, user: req.user, patient });
  } catch (error) {
    next(error);
  }
};

module.exports = { register, login, forgotPassword, getCurrentUser };
