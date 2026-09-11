import { Router } from "express";
import User from "../models/User.js";
import Appointment from "../models/Appointment.js";
import { auth, requireAdmin } from "../middleware/auth.js";

const router = Router();

// Protect all admin routes with auth & requireAdmin middleware
router.use(auth, requireAdmin);

// 1. GET Dashboard Statistics
router.get("/stats", async (req, res, next) => {
  try {
    const totalDoctors = await User.countDocuments({ role: "doctor" });
    const pendingDoctors = await User.countDocuments({ role: "doctor", approvalStatus: "pending" });
    const approvedDoctors = await User.countDocuments({ role: "doctor", approvalStatus: "approved" });
    const blockedDoctors = await User.countDocuments({ role: "doctor", isBlocked: true });

    const totalPatients = await User.countDocuments({ role: "patient" });
    const blockedPatients = await User.countDocuments({ role: "patient", isBlocked: true });

    const totalAppointments = await Appointment.countDocuments({});

    const recentUsers = await User.find({ role: { $ne: "admin" } })
      .select("-password")
      .sort({ createdAt: -1 })
      .limit(10);

    res.json({
      totalDoctors,
      pendingDoctors,
      approvedDoctors,
      blockedDoctors,
      totalPatients,
      blockedPatients,
      totalAppointments,
      recentUsers
    });
  } catch (err) {
    next(err);
  }
});

// 2. GET Doctors List (with status and search filters)
router.get("/doctors", async (req, res, next) => {
  try {
    const { status, search } = req.query;
    let filter = { role: "doctor" };

    if (status === "pending") {
      filter.approvalStatus = "pending";
    } else if (status === "approved") {
      filter.approvalStatus = "approved";
      filter.isBlocked = false;
    } else if (status === "rejected") {
      filter.approvalStatus = "rejected";
    } else if (status === "blocked") {
      filter.isBlocked = true;
    }

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { specialization: { $regex: search, $options: "i" } }
      ];
    }

    const doctors = await User.find(filter)
      .select("-password")
      .sort({ createdAt: -1 });

    res.json(doctors);
  } catch (err) {
    next(err);
  }
});

// 3. PUT Doctor Approval Status (Approve / Reject)
router.put("/doctors/:id/approval", async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!["approved", "rejected", "pending"].includes(status)) {
      return res.status(400).json({ message: "Invalid status value." });
    }

    const doctor = await User.findOne({ _id: req.params.id, role: "doctor" });
    if (!doctor) {
      return res.status(404).json({ message: "Doctor not found." });
    }

    doctor.approvalStatus = status;
    await doctor.save();

    res.json({
      message: `Doctor application updated to ${status}.`,
      doctor: {
        id: doctor._id,
        name: doctor.name,
        email: doctor.email,
        approvalStatus: doctor.approvalStatus
      }
    });
  } catch (err) {
    next(err);
  }
});

// 4. GET Patients List
router.get("/patients", async (req, res, next) => {
  try {
    const { search, blockedOnly } = req.query;
    let filter = { role: "patient" };

    if (blockedOnly === "true") {
      filter.isBlocked = true;
    }

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } }
      ];
    }

    const patients = await User.find(filter)
      .select("-password")
      .sort({ createdAt: -1 });

    res.json(patients);
  } catch (err) {
    next(err);
  }
});

// 5. PUT Block / Unblock User (Doctor or Patient)
router.put("/users/:id/block", async (req, res, next) => {
  try {
    const { isBlocked } = req.body;
    if (typeof isBlocked !== "boolean") {
      return res.status(400).json({ message: "isBlocked boolean value required." });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    if (user.role === "admin") {
      return res.status(403).json({ message: "Cannot block an Admin account." });
    }

    user.isBlocked = isBlocked;
    await user.save();

    res.json({
      message: `User ${user.name} has been ${isBlocked ? "blocked" : "unblocked"}.`,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isBlocked: user.isBlocked
      }
    });
  } catch (err) {
    next(err);
  }
});

// 6. DELETE User (Doctor or Patient)
router.delete("/users/:id", async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    if (user.role === "admin") {
      return res.status(403).json({ message: "Admin account cannot be deleted." });
    }

    await User.findByIdAndDelete(req.params.id);

    // Optionally delete associated appointments if needed
    await Appointment.deleteMany({
      $or: [{ patientId: req.params.id }, { doctorId: req.params.id }]
    });

    res.json({ message: `Account for ${user.name} has been permanently deleted.` });
  } catch (err) {
    next(err);
  }
});

export default router;
