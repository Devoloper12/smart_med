const mongoose = require('mongoose');
const CaregiverModel = require('../models/Caregiver');
const CaregiverDomain = require('../classes/CaregiverDomain');
const fallbackStore = require('../utils/fallbackStore');
const { resolvePatientId } = require('./patientController');

const isDBConnected = () => mongoose.connection.readyState === 1;

const getCaregivers = async (req, res, next) => {
  try {
    const patientId = await resolvePatientId(req);
    if (isDBConnected()) {
      const caregivers = await CaregiverModel.find({ patientId }).sort({ isPrimary: -1, createdAt: -1 });
      return res.status(200).json({ success: true, count: caregivers.length, caregivers });
    } else {
      const caregivers = fallbackStore.caregivers.filter(c => String(c.patientId) === String(patientId));
      return res.status(200).json({ success: true, count: caregivers.length, caregivers });
    }
  } catch (error) {
    next(error);
  }
};

const addCaregiver = async (req, res, next) => {
  try {
    const patientId = await resolvePatientId(req);
    const { name, phone, relationship, email, isPrimary } = req.body;

    if (!name || !phone || !relationship) {
      return res.status(400).json({ success: false, message: 'Name, phone number, and relationship are required.' });
    }

    if (isDBConnected()) {
      if (isPrimary) await CaregiverModel.updateMany({ patientId }, { isPrimary: false });

      const caregiver = new CaregiverModel({
        patientId,
        name,
        phone,
        relationship,
        email: email || '',
        isPrimary: Boolean(isPrimary)
      });
      const savedCaregiver = await caregiver.save();
      return res.status(201).json({ success: true, message: 'Caregiver added successfully!', caregiver: savedCaregiver });
    } else {
      const newCg = { _id: 'cg_' + Date.now(), patientId, name, phone, relationship, email, isPrimary };
      fallbackStore.caregivers.push(newCg);
      return res.status(201).json({ success: true, message: 'Caregiver added successfully!', caregiver: newCg });
    }
  } catch (error) {
    next(error);
  }
};

const updateCaregiver = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, phone, relationship, email, isPrimary } = req.body;

    if (isDBConnected()) {
      const caregiver = await CaregiverModel.findByIdAndUpdate(
        id,
        { $set: { name, phone, relationship, email, isPrimary } },
        { new: true }
      );
      return res.status(200).json({ success: true, message: 'Caregiver updated!', caregiver });
    } else {
      const cg = fallbackStore.caregivers.find(c => String(c._id) === String(id));
      if (cg) { Object.assign(cg, { name, phone, relationship, email, isPrimary }); }
      return res.status(200).json({ success: true, message: 'Caregiver updated!', caregiver: cg });
    }
  } catch (error) {
    next(error);
  }
};

const deleteCaregiver = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (isDBConnected()) {
      await CaregiverModel.findByIdAndDelete(id);
    } else {
      fallbackStore.caregivers = fallbackStore.caregivers.filter(c => String(c._id) !== String(id));
    }
    return res.status(200).json({ success: true, message: 'Caregiver removed.' });
  } catch (error) {
    next(error);
  }
};

const notifyCaregiver = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { message = 'Patient medicine update notification', type = 'CUSTOM_NOTIFICATION' } = req.body;

    let caregiverData = isDBConnected() ? await CaregiverModel.findById(id) : fallbackStore.caregivers.find(c => String(c._id) === String(id));
    if (!caregiverData) return res.status(404).json({ success: false, message: 'Caregiver not found.' });

    const caregiverDomain = new CaregiverDomain({
      name: caregiverData.name,
      phone: caregiverData.phone,
      relationship: caregiverData.relationship
    });

    const receipt = caregiverDomain.receiveAlert({ type, message, patientName: req.user.name });

    return res.status(200).json({
      success: true,
      message: `Notification sent to ${caregiverData.name}!`,
      deliveryReport: receipt
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getCaregivers, addCaregiver, updateCaregiver, deleteCaregiver, notifyCaregiver };
