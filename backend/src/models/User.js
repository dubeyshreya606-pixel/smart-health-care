import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    role: { type: String, enum: ["patient", "doctor", "admin"], required: true },
    phone: { type: String, trim: true },
    specialization: { type: String, trim: true },
    qualification: { type: String, trim: true },
    medicalRegNo: { type: String, trim: true },
    experience: { type: String, trim: true },
    fees: { type: Number, default: 0, min: 0 },
    age: { type: Number },
    gender: { type: String, trim: true },
    approvalStatus: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: function () {
        return (this && this.role === "doctor") ? "pending" : "approved";
      }
    },
    isBlocked: { type: Boolean, default: false }
  },
  { timestamps: true }
);

export default mongoose.model("User", userSchema);
