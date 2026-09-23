import { Router } from "express";
import crypto from "crypto";
import Appointment from "../models/Appointment.js";
import User from "../models/User.js";
import { auth } from "../middleware/auth.js";

const router = Router();

router.post("/", auth, async (req, res, next) => {
  try {
    if (req.user.role !== "patient") {
      return res.status(403).json({ message: "Only patients can create appointments." });
    }

    const { doctorId, date, reason, payNow, paymentMethod, timeSlot } = req.body;
    if (!doctorId || !date || !reason) {
      return res.status(400).json({ message: "Doctor, date and reason are required." });
    }

    const doctor = await User.findById(doctorId);
    if (!doctor || doctor.approvalStatus !== "approved" || doctor.isBlocked) {
      return res.status(404).json({ message: "Doctor not found or not currently available for appointments." });
    }

    const fee = doctor?.fees ?? 0;
    const resolvedTimeSlot = timeSlot || "Flexible";

    // Prevent duplicate appointment creation within 10 seconds window for same patient, doctor, and reason
    const existingRecent = await Appointment.findOne({
      patient: req.user.id,
      doctor: doctorId,
      reason: reason,
      createdAt: { $gte: new Date(Date.now() - 10000) }
    }).populate("doctor", "name specialization fees").populate("patient", "name email");

    if (existingRecent) {
      return res.status(200).json(existingRecent);
    }

    const isPaid = Boolean(payNow && paymentMethod && paymentMethod !== "cash");
    const validMethod = ["upi", "card", "netbanking", "cash"].includes(paymentMethod) ? paymentMethod : (isPaid ? "upi" : "cash");

    const appointment = await Appointment.create({
      patient: req.user.id,
      doctor: doctorId,
      date: new Date(date),
      timeSlot: resolvedTimeSlot,
      reason,
      fee,
      paymentStatus: isPaid ? "paid" : "pending",
      paymentMethod: validMethod,
      paymentId: isPaid ? `PAY-${crypto.randomUUID().slice(0, 8).toUpperCase()}` : undefined,
      paidAt: isPaid ? new Date() : undefined,
      roomId: crypto.randomUUID()
    });

    const result = await Appointment.findById(appointment._id)
      .populate("doctor", "name specialization fees")
      .populate("patient", "name email");

    res.status(201).json(result);
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

    const appointments = await Appointment.find(filter)
      .populate("doctor", "name specialization fees")
      .populate("patient", "name email")
      .sort({ date: 1 });

    res.json(appointments);
  } catch (err) {
    next(err);
  }
});

router.post("/:id/pay", auth, async (req, res, next) => {
  try {
    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) return res.status(404).json({ message: "Appointment not found." });

    if (appointment.patient.toString() !== req.user.id) {
      return res.status(403).json({ message: "Only the booking patient can make payment for this appointment." });
    }

    if (appointment.paymentStatus === "paid") {
      return res.status(400).json({ message: "This appointment has already been paid for." });
    }

    const { paymentMethod } = req.body;
    const validMethod = ["upi", "card", "netbanking", "cash"].includes(paymentMethod) ? paymentMethod : "upi";

    appointment.paymentStatus = "paid";
    appointment.paymentMethod = validMethod;
    appointment.paymentId = `PAY-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
    appointment.paidAt = new Date();

    await appointment.save();

    const result = await Appointment.findById(appointment._id)
      .populate("doctor", "name specialization fees")
      .populate("patient", "name email");

    res.json({
      message: "Payment processed successfully.",
      appointment: result
    });
  } catch (err) {
    next(err);
  }
});

router.patch("/:id/mark-paid", auth, async (req, res, next) => {
  try {
    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) return res.status(404).json({ message: "Appointment not found." });

    if (appointment.doctor.toString() !== req.user.id) {
      return res.status(403).json({ message: "Only the assigned doctor can mark offline payments as paid." });
    }

    appointment.paymentStatus = "paid";
    appointment.paymentMethod = req.body.paymentMethod || "cash";
    appointment.paymentId = `CASH-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
    appointment.paidAt = new Date();

    await appointment.save();

    const result = await Appointment.findById(appointment._id)
      .populate("doctor", "name specialization fees")
      .populate("patient", "name email");

    res.json({
      message: "Appointment marked as paid.",
      appointment: result
    });
  } catch (err) {
    next(err);
  }
});

router.patch("/:id/status", auth, async (req, res, next) => {
  try {
    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) return res.status(404).json({ message: "Appointment not found." });

    const allowed =
      appointment.patient.toString() === req.user.id ||
      appointment.doctor.toString() === req.user.id;

    if (!allowed) return res.status(403).json({ message: "Access denied." });

    appointment.status = req.body.status;
    await appointment.save();
    res.json(appointment);
  } catch (err) {
    next(err);
  }
});

export default router;
