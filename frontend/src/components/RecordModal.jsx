import { useState } from "react";
import { FileText, X, Activity, HeartPulse, Thermometer, ShieldCheck, Save } from "lucide-react";
import api from "../api";

export default function RecordModal({ patients = [], preselectedPatientId, onClose, onSuccess }) {
  const getPatientDisplayName = (p) => {
    if (!p) return "Patient";
    if (p.name && p.name.trim() !== "" && p.name.trim() !== "None") return p.name;
    if (p.email) return p.email.split("@")[0];
    return "Patient";
  };

  const [patientId, setPatientId] = useState(() => preselectedPatientId || (patients[0]?._id || ""));
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Consultation Note");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [bp, setBp] = useState("");
  const [hr, setHr] = useState("");
  const [temp, setTemp] = useState("");
  const [sugar, setSugar] = useState("");
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    if (!patientId) {
      setError("Please select a patient.");
      return;
    }
    setError("");
    setLoading(true);

    try {
      const vitals = {};
      if (bp.trim()) vitals.bloodPressure = bp.trim();
      if (hr.trim()) vitals.heartRate = hr.trim();
      if (temp.trim()) vitals.temperature = temp.trim();
      if (sugar.trim()) vitals.bloodSugar = sugar.trim();

      const res = await api.post("/records", {
        patientId,
        title,
        category,
        description,
        vitals,
        date
      });

      if (onSuccess) onSuccess(res.data);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save medical record.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget && !loading) onClose(); }}>
      <div className="modal-content fade-in" style={{ maxWidth: "580px" }}>
        <div className="modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div className="logo-badge" style={{ width: "36px", height: "36px" }}>
              <FileText size={20} color="#ffffff" />
            </div>
            <h3 style={{ margin: 0, fontSize: "18px" }}>Add Medical Record</h3>
          </div>
          <button type="button" className="close-btn" disabled={loading} onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {error && <div className="error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Select Patient</label>
            <select
              required
              value={patientId}
              onChange={e => setPatientId(e.target.value)}
            >
              <option value="">-- Choose Patient --</option>
              {patients && patients.length > 0 ? (
                patients.map(p => (
                  <option key={p._id} value={p._id}>
                    {getPatientDisplayName(p)} {p.email ? `(${p.email})` : ""}
                  </option>
                ))
              ) : (
                <option value="" disabled>No registered patients available</option>
              )}
            </select>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div className="form-group">
              <label>Record Category</label>
              <select value={category} onChange={e => setCategory(e.target.value)}>
                <option value="Consultation Note">Consultation Note</option>
                <option value="Lab Report">Lab Report</option>
                <option value="Diagnosis">Diagnosis</option>
                <option value="Vitals">Vitals Record</option>
                <option value="Follow-up">Follow-up Note</option>
                <option value="General">General Medical History</option>
              </select>
            </div>
            <div className="form-group">
              <label>Record Date</label>
              <input
                type="date"
                required
                value={date}
                onChange={e => setDate(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label>Record Title</label>
            <input
              type="text"
              required
              placeholder="e.g. Comprehensive Checkup & Lab Review"
              value={title}
              onChange={e => setTitle(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>Clinical Notes / Medical Observations</label>
            <textarea
              rows="3"
              required
              placeholder="Enter clinical observations, diagnoses, or treatment recommendations..."
              value={description}
              onChange={e => setDescription(e.target.value)}
            />
          </div>

          {/* Vitals Section */}
          <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "14px", padding: "16px", marginBottom: "18px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: "700", fontSize: "13px", color: "#0f172a", marginBottom: "12px" }}>
              <HeartPulse size={16} color="#0284c7" />
              <span>Patient Vitals (Optional)</span>
            </div>
            
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              <div>
                <label style={{ fontSize: "12px", color: "#64748b" }}>Blood Pressure</label>
                <input
                  placeholder="120/80 mmHg"
                  value={bp}
                  onChange={e => setBp(e.target.value)}
                />
              </div>
              <div>
                <label style={{ fontSize: "12px", color: "#64748b" }}>Heart Rate</label>
                <input
                  placeholder="72 bpm"
                  value={hr}
                  onChange={e => setHr(e.target.value)}
                />
              </div>
              <div>
                <label style={{ fontSize: "12px", color: "#64748b" }}>Temperature</label>
                <input
                  placeholder="98.6 °F"
                  value={temp}
                  onChange={e => setTemp(e.target.value)}
                />
              </div>
              <div>
                <label style={{ fontSize: "12px", color: "#64748b" }}>Blood Sugar</label>
                <input
                  placeholder="95 mg/dL"
                  value={sugar}
                  onChange={e => setSugar(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "8px", background: "#f0fdf4", border: "1px solid #bbf7d0", padding: "10px 14px", borderRadius: "10px", fontSize: "12px", color: "#166534", marginBottom: "18px" }}>
            <ShieldCheck size={16} color="#15803d" />
            <span>Record is securely encrypted and restricted to assigned patient and treating doctor.</span>
          </div>

          <div style={{ display: "flex", gap: "10px" }}>
            <button type="submit" className="primary" disabled={loading} style={{ flex: 1, padding: "12px" }}>
              <Save size={16} />
              <span>{loading ? "Saving..." : "Save Patient Record"}</span>
            </button>
            <button type="button" className="secondary-btn" disabled={loading} onClick={onClose}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
