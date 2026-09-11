import { Router } from "express";
import User from "../models/User.js";
import { auth, allow } from "../middleware/auth.js";

const router = Router();

router.get("/", auth, async (req, res, next) => {
  try {
    const doctors = await User.find({ role: "doctor", approvalStatus: "approved", isBlocked: { $ne: true } })
      .select("_id name email specialization fees qualification experience phone");
    res.json(doctors);
  } catch (err) {
    next(err);
  }
});

router.get("/patients", auth, allow("doctor"), async (req, res, next) => {
  try {
    const patients = await User.find({ role: "patient", isBlocked: { $ne: true } })
      .select("_id name email phone age gender");
    res.json(patients);
  } catch (err) {
    next(err);
  }
});

router.get("/profile", auth, allow("doctor"), async (req, res, next) => {
  try {
    const doctor = await User.findById(req.user.id).select("_id name email specialization fees phone");
    if (!doctor) return res.status(404).json({ message: "Doctor not found." });
    res.json(doctor);
  } catch (err) {
    next(err);
  }
});

router.put("/fees", auth, allow("doctor"), async (req, res, next) => {
  try {
    const { fees } = req.body;
    if (fees === undefined || isNaN(Number(fees)) || Number(fees) < 0) {
      return res.status(400).json({ message: "Please provide a valid consultation fee (must be 0 or greater)." });
    }

    const updatedDoctor = await User.findByIdAndUpdate(
      req.user.id,
      { fees: Number(fees) },
      { new: true }
    ).select("_id name email specialization fees");

    if (!updatedDoctor) {
      return res.status(404).json({ message: "Doctor not found." });
    }

    res.json({
      message: "Consultation fees updated successfully.",
      doctor: updatedDoctor,
      fees: updatedDoctor.fees
    });
  } catch (err) {
    next(err);
  }
});

export default router;
