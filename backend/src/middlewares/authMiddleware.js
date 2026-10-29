const jwt = require('jsonwebtoken');
const UserModel = require('../models/User');
const PatientModel = require('../models/Patient');

const authenticateToken = async (req, res, next) => {
  try {
    let token = null;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.query && req.query.token) {
      token = req.query.token;
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No authentication token provided.'
      });
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'smart_medicine_super_secret_jwt_key_2026_render_production'
    );

    let user = null;
    try {
      user = await UserModel.findById(decoded.id).select('-password');
    } catch (e) {}

    if (!user) {
      user = {
        _id: decoded.id,
        id: decoded.id,
        name: decoded.name,
        email: decoded.email,
        role: decoded.role
      };
    }

    req.user = user;

    try {
      const patientDoc = await PatientModel.findOne({ userId: user._id || user.id });
      if (patientDoc) {
        req.patient = patientDoc;
        req.patientId = patientDoc._id;
      }
    } catch (e) {}

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired authentication token. Please log in again.',
      error: error.message
    });
  }
};

const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Caregiver accounts are read-only monitoring accounts and cannot perform this action.`
      });
    }
    next();
  };
};

const restrictTo = authorizeRoles;

module.exports = {
  authenticateToken,
  authorizeRoles,
  restrictTo
};
