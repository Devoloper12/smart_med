const jwt = require('jsonwebtoken');
const UserModel = require('../models/User');

class User {
  constructor({ id = null, name = '', email = '', role = 'patient' } = {}) {
    this.id = id;
    this.name = name;
    this.email = email;
    this.role = role;
    this.isAuthenticated = Boolean(id);
  }

  async login(password) {
    if (!this.email || !password) {
      throw new Error('Email and password are required for login.');
    }

    const userDoc = await UserModel.findOne({ email: this.email.toLowerCase() }).select('+password');
    if (!userDoc) {
      throw new Error('Invalid email or password.');
    }

    const isMatch = await userDoc.comparePassword(password);
    if (!isMatch) {
      throw new Error('Invalid email or password.');
    }

    this.id = userDoc._id;
    this.name = userDoc.name;
    this.email = userDoc.email;
    this.role = userDoc.role;
    this.isAuthenticated = true;

    const token = jwt.sign(
      { id: this.id, email: this.email, role: this.role, name: this.name },
      process.env.JWT_SECRET || 'smart_medicine_super_secret_jwt_key_2026_render_production',
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    return {
      user: {
        id: this.id,
        name: this.name,
        email: this.email,
        role: this.role
      },
      token
    };
  }

  logout() {
    this.isAuthenticated = false;
    return {
      success: true,
      message: `User ${this.email || this.name} successfully logged out.`
    };
  }

  getUserProfile() {
    return {
      id: this.id,
      name: this.name,
      email: this.email,
      role: this.role
    };
  }
}

module.exports = User;
