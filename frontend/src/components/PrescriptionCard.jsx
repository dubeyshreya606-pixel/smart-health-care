import { Download, Pill, CheckCircle2, Clock, Stethoscope } from "lucide-react";
import { generatePrescriptionPDF } from "../utils/pdfGenerator";

export default function PrescriptionCard({ prescription }) {
  const appointment = prescription.appointment || {};
  const fee = appointment.fee ?? prescription.doctor?.fees ?? 0;
  const isPaid = appointment.paymentStatus === "paid";

  function handleDownloadPDF() {
    const patientName = (prescription.patient?.name && prescription.patient.name !== "None") ? prescription.patient.name : (prescription.patient?.email ? prescription.patient.email.split("@")[0] : "Patient");
    const doctorName = (prescription.doctor?.name && prescription.doctor.name !== "None") ? prescription.doctor.name : "Doctor";

    generatePrescriptionPDF({
      doctorName,
      doctorSpecialization: prescription.doctor?.specialization || "General Physician",
      patientName,
      patientEmail: prescription.patient?.email || "",
      diagnosis: prescription.diagnosis,
      medicines: prescription.medicines || [],
      instructions: prescription.instructions || "",
      date: prescription.createdAt,
      fee,
      paymentStatus: isPaid ? "Paid" : "Pending",
      prescriptionId: prescription._id
    });
  }

  return (
    <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "16px", padding: "20px", marginBottom: "16px", boxShadow: "0 2px 8px rgba(0,0,0,0.03)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
            <div style={{ background: "#e0f2fe", color: "#0284c7", padding: "6px", borderRadius: "8px" }}>
              <Stethoscope size={18} />
            </div>
            <strong style={{ fontSize: "17px", color: "#0f172a" }}>{prescription.diagnosis}</strong>
          </div>
          
          <p style={{ margin: "4px 0", fontSize: "14px", color: "#64748b" }}>
            Attending Doctor: <strong style={{ color: "#0f172a" }}>{prescription.doctor?.name}</strong> {prescription.doctor?.specialization ? `(${prescription.doctor.specialization})` : ""}
          </p>

          <div style={{ display: "flex", gap: "8px", alignItems: "center", margin: "10px 0", flexWrap: "wrap" }}>
            <span className="badge-pill-header">Consultation Fee: ₹{fee}</span>
            {isPaid ? (
              <span className="badge completed">
                <CheckCircle2 size={12} /> Paid via {(appointment.paymentMethod || "ONLINE").toUpperCase()} {appointment.paymentId ? `(${appointment.paymentId})` : ""}
              </span>
            ) : (
              <span className="badge pending">
                <Clock size={12} /> Payment Pending / Clinic Desk
              </span>
            )}
          </div>

          <div style={{ margin: "14px 0 10px", display: "flex", flexDirection: "column", gap: "8px" }}>
            <strong style={{ fontSize: "13px", color: "#334155", textTransform: "uppercase", letterSpacing: "0.5px" }}>Rx Medications</strong>
            {prescription.medicines?.map((m, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: "10px", background: "#f8fafc", padding: "8px 12px", borderRadius: "8px", border: "1px solid #f1f5f9", fontSize: "13px" }}>
                <Pill size={15} color="#0284c7" />
                <strong style={{ color: "#0f172a" }}>{m.name}</strong>
                <span style={{ color: "#64748b" }}>• {m.dosage} • {m.frequency} • {m.duration}</span>
              </div>
            ))}
          </div>

          {prescription.instructions && (
            <p style={{ fontSize: "13px", color: "#475569", margin: "8px 0 0", background: "#fffbeb", border: "1px solid #fef3c7", padding: "8px 12px", borderRadius: "8px" }}>
              <strong>Instructions:</strong> {prescription.instructions}
            </p>
          )}
        </div>

        <button className="primary" onClick={handleDownloadPDF} style={{ padding: "10px 16px", fontSize: "13px", borderRadius: "10px" }}>
          <Download size={15} />
          <span>Export RX & Invoice (PDF)</span>
        </button>
      </div>
    </div>
  );
}
