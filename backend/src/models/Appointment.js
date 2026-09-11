import mongoose from "mongoose";

const appointmentSchema = new mongoose.Schema(
  {
    patient: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    doctor: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    date: { type: Date, required: true },
    timeSlot: { type: String, default: "Flexible", trim: true },
    duration: { type: Number, default: 30 },
    reason: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ["scheduled", "completed", "cancelled"],
      default: "scheduled"
    },
    fee: { type: Number, default: 0, min: 0 },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "refunded"],
      default: "pending"
    },
    paymentMethod: {
      type: String,
      enum: ["upi", "card", "netbanking", "cash", "none"],
      default: "none"
    },
    paymentId: { type: String, trim: true },
    paidAt: { type: Date },
    roomId: { type: String, required: true, unique: true }
  },
  { timestamps: true }
);

export default mongoose.model("Appointment", appointmentSchema);
