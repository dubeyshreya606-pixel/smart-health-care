import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { verifyFirebasePhoneToken } from "../config/firebaseAdmin.js";
import { verifyHumanToken } from "../middleware/humanVerify.js";

const router = Router();

router.post("/register", verifyHumanToken, async (req, res, next) => {
  try {
    const { name, email, password, role, phone, firebaseIdToken, specialization, qualification, medicalRegNo, experience, fees, age, gender } = req.body;

    if (!name || !email || !password || !role || !phone || !firebaseIdToken) {
      return res.status(400).json({ message: "Name, email, password, role, phone and phone verification are required." });
    }

    if (role === "admin") {
      return res.status(403).json({ message: "Public registration for Admin is strictly prohibited." });
    }

    if (!["patient", "doctor"].includes(role)) {
      return res.status(400).json({ message: "Invalid role specified." });
    }

    if (password.length < 8) {
      return res.status(400).json({ message: "Password must be at least 8 characters." });
    }

    await verifyFirebasePhoneToken(firebaseIdToken, phone);

    const exists = await User.findOne({ email });
    if (exists) return res.status(409).json({ message: "Email already registered." });

    const hash = await bcrypt.hash(password, 12);

    const parsedFees = role === "doctor" && fees !== undefined && !isNaN(Number(fees)) ? Math.max(0, Number(fees)) : 0;
    const approvalStatus = role === "doctor" ? "pending" : "approved";

    const user = await User.create({
      name,
      email,
      password: hash,
      role,
      phone,
      specialization: role === "doctor" ? specialization : undefined,
      qualification: role === "doctor" ? qualification : undefined,
      medicalRegNo: role === "doctor" ? medicalRegNo : undefined,
      experience: role === "doctor" ? experience : undefined,
      fees: parsedFees,
      age: role === "patient" ? (age ? Number(age) : undefined) : undefined,
      gender: role === "patient" ? gender : undefined,
      approvalStatus,
      isBlocked: false
    });

    const successMessage = role === "doctor"
      ? "Doctor application submitted successfully! Your account is pending admin approval before you can log in."
      : "Registration successful! You can now log in.";

    res.status(201).json({
      message: successMessage,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        approvalStatus: user.approvalStatus,
        isBlocked: user.isBlocked,
        specialization: user.specialization,
        fees: user.fees ?? 0
      }
    });
  } catch (err) {
    next(err);
  }
});

router.post("/login", async (req, res, next) => {
  try {
    const { email, password, role } = req.body;
    const user = await User.findOne({ email });

    if (!user || (role && user.role !== role) || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ message: "Invalid email or password for the selected portal." });
    }

    const adminEmail = (process.env.ADMIN_EMAIL || "dubeyshreya606@gmail.com").toLowerCase();
    if (user.role === "admin" && user.email.toLowerCase() !== adminEmail) {
      return res.status(403).json({
        message: "Admin portal access is strictly restricted to authorized system administrator."
      });
    }

    // Check if account is blocked
    if (user.isBlocked) {
      return res.status(403).json({
        message: "Your account has been blocked by the admin. Access denied."
      });
    }

    // Check if doctor registration is approved
    if (user.role === "doctor" && user.approvalStatus !== "approved") {
      if (user.approvalStatus === "rejected") {
        return res.status(403).json({
          message: "Your doctor registration application was rejected by the admin."
        });
      }
      return res.status(403).json({
        message: "Your doctor registration application is currently pending admin approval."
      });
    }

    const token = jwt.sign(
      { id: user._id.toString(), role: user.role, name: user.name, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "24h" }
    );

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        approvalStatus: user.approvalStatus,
        isBlocked: user.isBlocked,
        phone: user.phone,
        specialization: user.specialization,
        qualification: user.qualification,
        medicalRegNo: user.medicalRegNo,
        experience: user.experience,
        fees: user.fees ?? 0,
        age: user.age,
        gender: user.gender,
        createdAt: user.createdAt
      }
    });
  } catch (err) {
    next(err);
  }
});

export default router;

