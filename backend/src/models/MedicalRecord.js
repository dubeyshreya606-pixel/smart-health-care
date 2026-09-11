import mongoose from "mongoose";

const medicalRecordSchema = new mongoose.Schema(
  {
    patient: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    doctor: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title: { type: String, required: true, trim: true },
    category: {
      type: String,
      enum: ["Consultation Note", "Lab Report", "Diagnosis", "Vitals", "Follow-up", "General"],
      default: "Consultation Note"
    },
    description: { type: String, required: true, trim: true },
    vitals: {
      bloodPressure: { type: String, trim: true },
      heartRate: { type: String, trim: true },
      temperature: { type: String, trim: true },
      bloodSugar: { type: String, trim: true }
    },
    date: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

export default mongoose.model("MedicalRecord", medicalRecordSchema);
