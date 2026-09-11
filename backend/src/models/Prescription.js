import mongoose from "mongoose";

const prescriptionSchema = new mongoose.Schema(
  {
    appointment: { type: mongoose.Schema.Types.ObjectId, ref: "Appointment", required: true },
    patient: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    doctor: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    diagnosis: { type: String, required: true },
    medicines: [
      {
        name: String,
        dosage: String,
        frequency: String,
        duration: String
      }
    ],
    instructionsEncrypted: {
      iv: String,
      content: String,
      tag: String
    }
  },
  { timestamps: true }
);

export default mongoose.model("Prescription", prescriptionSchema);
