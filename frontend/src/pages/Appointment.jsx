import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Pill, Plus, Trash2, ShieldCheck, FileText, ArrowLeft, CheckCircle2, Download } from "lucide-react";
import Navbar from "../components/Navbar";
import { generatePrescriptionPDF } from "../utils/pdfGenerator";
import api from "../api";

export default function Appointment() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [currentUser] = useState(() => JSON.parse(localStorage.getItem("user") || "{}"));
  const [appointment, setAppointment] = useState(null);
  const [diagnosis, setDiagnosis] = useState("");
  const [instructions, setInstructions] = useState("");
  const [medicines, setMedicines] = useState([
    { name: "", dosage: "", frequency: "", duration: "" }
  ]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    api.get("/appointments")
      .then(res => {
        const found = res.data?.find(a => a._id === id || a.roomId === id);
        if (found) setAppointment(found);
      })
      .catch(err => console.error("Could not fetch appointment:", err));
  }, [id]);

  function updateMedicine(index, field, value) {
    setMedicines(ms => ms.map((m, i) => i === index ? { ...m, [field]: value } : m));
  }

  function addMedicineRow() {
    setMedicines([...medicines, { name: "", dosage: "", frequency: "", duration: "" }]);
  }

  function removeMedicineRow(index) {
    if (medicines.length === 1) return;
    setMedicines(ms => ms.filter((_, i) => i !== index));
  }

  const patientName = appointment?.patient?.name && appointment.patient.name !== "None"
    ? appointment.patient.name
    : (appointment?.patient?.email ? appointment.patient.email.split("@")[0] : "Patient");

  const doctorName = appointment?.doctor?.name || currentUser.name || "Doctor";

  function downloadCurrentPDF() {
    const validMedicines = medicines.filter(m => m.name.trim() !== "");
    generatePrescriptionPDF({
      doctorName,
      doctorSpecialization: appointment?.doctor?.specialization || currentUser.specialization || "General Physician",
      patientName,
      patientEmail: appointment?.patient?.email || "",
      diagnosis: diagnosis || "General Consultation",
      medicines: validMedicines.length > 0 ? validMedicines : [{ name: "Sample Medicine", dosage: "1 tab", frequency: "Daily", duration: "5 days" }],
      instructions,
      date: new Date(),
      fee: appointment?.fee || 0,
      paymentStatus: appointment?.paymentStatus || "completed"
    });
  }

  async function submit(e, downloadPdf = false) {
    if (e) e.preventDefault();
    setError("");
    setMessage("");

    const targetAppointmentId = appointment ? appointment._id : id;

    const validMedicines = medicines.filter(m => m.name.trim() !== "");
    if (validMedicines.length === 0) {
      setError("Please add at least one prescribed medicine.");
      return;
    }

    setLoading(true);
    try {
      const res = await api.post("/prescriptions", {
        appointmentId: targetAppointmentId,
        diagnosis,
        instructions,
        medicines: validMedicines
      });

      if (downloadPdf) {
        downloadCurrentPDF();
      }

      setMessage("Digital prescription note saved as PDF document & issued to patient successfully!");
      setTimeout(() => navigate("/"), 1400);
    } catch (err) {
      setError(err.response?.data?.message || "Could not create prescription.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc" }}>
      <Navbar />
      <main className="container page-content fade-in" style={{ maxWidth: "780px", margin: "30px auto", padding: "0 16px" }}>
        
        <button
          type="button"
          className="secondary-btn"
          onClick={() => navigate("/")}
          style={{ marginBottom: "20px", display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "13px" }}
        >
          <ArrowLeft size={16} />
          <span>Back to Dashboard</span>
        </button>

        <div className="card" style={{ padding: "28px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px", borderBottom: "1px solid #f1f5f9", paddingBottom: "16px" }}>
            <div className="logo-badge" style={{ width: "42px", height: "42px" }}>
              <Pill size={22} color="#ffffff" />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: "20px", fontWeight: "800", color: "#0f172a" }}>Issue Digital Prescription (Rx)</h2>
              <p style={{ margin: "2px 0 0", fontSize: "13px", color: "#64748b" }}>
                Prescription instructions are end-to-end encrypted before storing in patient records.
              </p>
            </div>
          </div>

          {appointment && (
            <div style={{ background: "#e0f2fe", border: "1px solid #bae6fd", borderRadius: "12px", padding: "14px 18px", marginBottom: "20px" }}>
              <div style={{ fontSize: "12px", color: "#0369a1", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Patient Consultation Details
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "4px", flexWrap: "wrap", gap: "8px" }}>
                <strong style={{ fontSize: "16px", color: "#0c4a6e" }}>{patientName}</strong>
                <span style={{ fontSize: "13px", color: "#0284c7" }}>{appointment.patient?.email}</span>
              </div>
              {appointment.reason && (
                <p style={{ margin: "6px 0 0", fontSize: "13px", color: "#0369a1" }}>
                  <strong>Chief Complaint:</strong> {appointment.reason}
                </p>
              )}
            </div>
          )}

          {message && (
            <div className="success" style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
              <CheckCircle2 size={18} />
              <span>{message}</span>
            </div>
          )}
          {error && <div className="error" style={{ marginBottom: "16px" }}>{error}</div>}

          <form onSubmit={submit}>
            <div className="form-group" style={{ marginBottom: "20px" }}>
              <label style={{ fontWeight: "700", color: "#0f172a", fontSize: "14px" }}>Clinical Diagnosis *</label>
              <input
                type="text"
                required
                value={diagnosis}
                onChange={e => setDiagnosis(e.target.value)}
                placeholder="e.g. Acute Upper Respiratory Infection / Hypertension"
                style={{ padding: "12px", fontSize: "14px" }}
              />
            </div>

            <div style={{ marginBottom: "24px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                <label style={{ fontWeight: "700", color: "#0f172a", fontSize: "14px", margin: 0 }}>Prescribed Medications (Rx) *</label>
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={addMedicineRow}
                  style={{ padding: "6px 12px", fontSize: "12px", display: "inline-flex", alignItems: "center", gap: "4px" }}
                >
                  <Plus size={14} />
                  <span>Add Medicine Row</span>
                </button>
              </div>

              {medicines.map((m, i) => (
                <div key={i} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr auto", gap: "8px", marginBottom: "10px", alignItems: "center" }}>
                  <input
                    placeholder="Medicine Name (e.g. Paracetamol 500mg)"
                    value={m.name}
                    onChange={e => updateMedicine(i, "name", e.target.value)}
                    style={{ padding: "10px", fontSize: "13px" }}
                  />
                  <input
                    placeholder="Dosage (e.g. 1 tab)"
                    value={m.dosage}
                    onChange={e => updateMedicine(i, "dosage", e.target.value)}
                    style={{ padding: "10px", fontSize: "13px" }}
                  />
                  <input
                    placeholder="Frequency (e.g. Twice daily)"
                    value={m.frequency}
                    onChange={e => updateMedicine(i, "frequency", e.target.value)}
                    style={{ padding: "10px", fontSize: "13px" }}
                  />
                  <input
                    placeholder="Duration (e.g. 5 days)"
                    value={m.duration}
                    onChange={e => updateMedicine(i, "duration", e.target.value)}
                    style={{ padding: "10px", fontSize: "13px" }}
                  />
                  <button
                    type="button"
                    className="danger"
                    disabled={medicines.length === 1}
                    onClick={() => removeMedicineRow(i)}
                    style={{ padding: "10px", borderRadius: "8px", opacity: medicines.length === 1 ? 0.4 : 1 }}
                    title="Remove item"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>

            <div className="form-group" style={{ marginBottom: "20px" }}>
              <label style={{ fontWeight: "700", color: "#0f172a", fontSize: "14px" }}>Special Instructions & Dietary Advice</label>
              <textarea
                rows="4"
                value={instructions}
                onChange={e => setInstructions(e.target.value)}
                placeholder="Take medicines post meals. Drink plenty of water and rest..."
                style={{ padding: "12px", fontSize: "14px" }}
              />
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "8px", background: "#f0fdf4", border: "1px solid #bbf7d0", padding: "12px", borderRadius: "10px", fontSize: "12px", color: "#166534", marginBottom: "20px" }}>
              <ShieldCheck size={18} color="#15803d" />
              <span>This prescription is digitally generated, encrypted, and immediately available on the patient's dashboard.</span>
            </div>

            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
              <button
                type="button"
                className="primary"
                disabled={loading}
                onClick={(e) => submit(e, true)}
                style={{ flex: "1 1 220px", padding: "14px", fontSize: "14px", borderRadius: "10px", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "8px" }}
              >
                <Download size={18} />
                <span>{loading ? "Generating PDF..." : "Save & Export PDF Document"}</span>
              </button>

              <button
                type="button"
                className="secondary-btn"
                disabled={loading}
                onClick={(e) => submit(e, false)}
                style={{ padding: "14px 18px", fontSize: "14px", borderRadius: "10px", display: "inline-flex", alignItems: "center", gap: "6px", background: "#f1f5f9" }}
              >
                <FileText size={16} />
                <span>Save Online Only</span>
              </button>

              <button
                type="button"
                className="secondary-btn"
                disabled={loading}
                onClick={() => navigate("/")}
                style={{ padding: "14px 18px", borderRadius: "10px", fontSize: "14px" }}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
