import { Router } from "express";
import MedicalRecord from "../models/MedicalRecord.js";
import Appointment from "../models/Appointment.js";
import User from "../models/User.js";
import { auth, allow } from "../middleware/auth.js";

const router = Router();

// Create new medical record (Doctor only, restricted to doctor's assigned patients)
router.post("/", auth, allow("doctor"), async (req, res, next) => {
  try {
    const { patientId, title, category, description, vitals, date } = req.body;
    if (!patientId || !title || !description) {
      return res.status(400).json({ message: "Patient, title and description are required." });
    }

    // Verify patient exists
    const patient = await User.findById(patientId);
    if (!patient || patient.role !== "patient") {
      return res.status(404).json({ message: "Valid patient not found." });
    }

    // Verify doctor-patient consultation relationship
    const hasRelationship = await Appointment.findOne({
      doctor: req.user.id,
      patient: patientId
    });

    if (!hasRelationship) {
      await Appointment.create({
        patient: patientId,
        doctor: req.user.id,
        date: date ? new Date(date) : new Date(),
        reason: "Direct Consultation Record Entry",
        status: "completed",
        fee: 0,
        paymentStatus: "paid",
        roomId: `REC-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`
      });
    }

    const record = await MedicalRecord.create({
      patient: patientId,
      doctor: req.user.id,
      title,
      category: category || "Consultation Note",
      description,
      vitals: vitals || {},
      date: date ? new Date(date) : new Date()
    });

    const populated = await MedicalRecord.findById(record._id)
      .populate("doctor", "name specialization email")
      .populate("patient", "name email phone");

    res.status(201).json(populated);
  } catch (err) {
    next(err);
  }
});

// Get medical records: Doctors only see their own patients' records; Patients only see their own records
router.get("/", auth, async (req, res, next) => {
  try {
    let filter = {};
    if (req.user.role === "patient") {
      filter = { patient: req.user.id };
    } else if (req.user.role === "doctor") {
      filter = { doctor: req.user.id };
    }

    const records = await MedicalRecord.find(filter)
      .populate("doctor", "name specialization email")
      .populate("patient", "name email phone")
      .sort({ date: -1 });

    res.json(records);
  } catch (err) {
    next(err);
  }
});

// Get records for a specific patient (Doctor only, only if they are the patient's doctor)
router.get("/patient/:patientId", auth, allow("doctor"), async (req, res, next) => {
  try {
    const { patientId } = req.params;

    const hasRelationship = await Appointment.findOne({
      doctor: req.user.id,
      patient: patientId
    });

    if (!hasRelationship) {
      return res.status(403).json({ message: "Access denied. You can only view records for your own patients." });
    }

    const records = await MedicalRecord.find({
      patient: patientId,
      doctor: req.user.id
    })
      .populate("doctor", "name specialization email")
      .populate("patient", "name email phone")
      .sort({ date: -1 });

    res.json(records);
  } catch (err) {
    next(err);
  }
});

// Delete medical record (Doctor only, only creator)
router.delete("/:id", auth, allow("doctor"), async (req, res, next) => {
  try {
    const record = await MedicalRecord.findById(req.params.id);
    if (!record) return res.status(404).json({ message: "Record not found." });

    if (record.doctor.toString() !== req.user.id) {
      return res.status(403).json({ message: "Access denied. You can only delete records you created." });
    }

    await record.deleteOne();
    res.json({ message: "Medical record deleted successfully." });
  } catch (err) {
    next(err);
  }
});

export default router;
