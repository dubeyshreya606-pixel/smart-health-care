import { Router } from "express";
import Prescription from "../models/Prescription.js";
import Appointment from "../models/Appointment.js";
import { auth, allow } from "../middleware/auth.js";
import { encrypt, decrypt } from "../services/encryption.js";

const router = Router();

router.post("/", auth, allow("doctor"), async (req, res, next) => {
  try {
    const { appointmentId, diagnosis, medicines, instructions } = req.body;

    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) return res.status(404).json({ message: "Appointment not found." });

    if (appointment.doctor.toString() !== req.user.id) {
      return res.status(403).json({ message: "You are not the assigned doctor." });
    }

    const prescription = await Prescription.create({
      appointment: appointment._id,
      patient: appointment.patient,
      doctor: appointment.doctor,
      diagnosis,
      medicines: medicines || [],
      instructionsEncrypted: encrypt(instructions || "")
    });

    appointment.status = "completed";
    await appointment.save();

    res.status(201).json({
      id: prescription._id,
      message: "Prescription created successfully."
    });
  } catch (err) {
    next(err);
  }
});

router.get("/", auth, async (req, res, next) => {
  try {
    let filter = {};
    if (req.user.role === "doctor") {
      filter = { doctor: req.user.id };
    } else if (req.user.role === "patient") {
      filter = { patient: req.user.id };
    }

    const prescriptions = await Prescription.find(filter)
      .populate("doctor", "name specialization fees")
      .populate("patient", "name email")
      .populate("appointment", "fee paymentStatus paymentMethod paymentId paidAt")
      .sort({ createdAt: -1 })
      .lean();

    const output = prescriptions.map((p) => ({
      ...p,
      instructions: decrypt(p.instructionsEncrypted),
      instructionsEncrypted: undefined
    }));

    res.json(output);
  } catch (err) {
    next(err);
  }
});

export default router;
