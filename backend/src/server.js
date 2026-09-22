import "dotenv/config";
import http from "http";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import bcrypt from "bcryptjs";
import { Server } from "socket.io";
import { connectDB } from "./config/db.js";
import { notFound, errorHandler } from "./middleware/error.js";
import authRoutes from "./routes/auth.js";
import doctorRoutes from "./routes/doctors.js";
import appointmentRoutes from "./routes/appointments.js";
import prescriptionRoutes from "./routes/prescriptions.js";
import medicalRecordRoutes from "./routes/medicalRecords.js";
import adminRoutes from "./routes/admin.js";
import User from "./models/User.js";
import { setupSocket } from "./socket.js";

const app = express();
const server = http.createServer(app);

const corsOriginCheck = (origin, callback) => {
  // Allow mobile apps, native Capacitor apps, local network IPs, and standard web clients
  callback(null, true);
};

const io = new Server(server, {
  cors: {
    origin: corsOriginCheck,
    methods: ["GET", "POST"],
    credentials: true
  }
});

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: corsOriginCheck, credentials: true }));
app.use(express.json({ limit: "1mb" }));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 200,
  standardHeaders: true,
  legacyHeaders: false
});
app.use(limiter);

app.get("/api/health", (req, res) => res.json({ ok: true }));

app.get("/", (req, res) => {
  res.json({
    message: "Smart Health Care API is running successfully"
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/doctors", doctorRoutes);
app.use("/api/appointments", appointmentRoutes);
app.use("/api/prescriptions", prescriptionRoutes);
app.use("/api/records", medicalRecordRoutes);
app.use("/api/admin", adminRoutes);

setupSocket(io);

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

async function seedAdminUser() {
  try {
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminEmail || !adminPassword) {
      console.log("[SEED] ADMIN_EMAIL or ADMIN_PASSWORD not configured in environment variables. Skipping automatic admin creation.");
      return;
    }

    const existingAdmin = await User.findOne({ email: adminEmail });
    if (!existingAdmin) {
      const hash = await bcrypt.hash(adminPassword, 12);
      await User.create({
        name: process.env.ADMIN_NAME || "System Admin",
        email: adminEmail,
        password: hash,
        role: "admin",
        approvalStatus: "approved",
        isBlocked: false,
        phone: process.env.ADMIN_PHONE || "0000000000"
      });
      console.log(`[SEED] Admin account (${adminEmail}) seeded successfully!`);
    } else {
      // Ensure existing account has role: 'admin', approvalStatus: 'approved', and synced password
      const isMatch = await bcrypt.compare(adminPassword, existingAdmin.password);
      if (!isMatch || existingAdmin.role !== "admin" || existingAdmin.approvalStatus !== "approved") {
        if (!isMatch) {
          existingAdmin.password = await bcrypt.hash(adminPassword, 12);
        }
        existingAdmin.role = "admin";
        existingAdmin.approvalStatus = "approved";
        existingAdmin.isBlocked = false;
        await existingAdmin.save();
        console.log(`[SEED] Fixed Admin permissions and credentials assigned to ${adminEmail}`);
      }
    }
  } catch (err) {
    console.error("[SEED] Error seeding admin user:", err);
  }
}

server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(`[SERVER WARNING] Port ${PORT} is busy. Retrying in 1s...`);
    setTimeout(() => {
      server.close();
      server.listen(PORT);
    }, 1000);
  } else {
    console.error("[SERVER ERROR]", err);
  }
});



connectDB()
  .then(async () => {
    await seedAdminUser();

    server.listen(PORT, "0.0.0.0", () => {
      console.log(`Backend running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Database connection failed:", err);
    process.exit(1);
  });
