import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Activity, Calendar, FileText, Stethoscope, Video, Search, Plus, CheckCircle2, Clock, ShieldCheck, Heart, Sparkles, UserCheck, DollarSign, Filter, CreditCard, Award, Eye, Smile, ChevronRight, User, Download } from "lucide-react";
import api from "../api";
import PrescriptionCard from "../components/PrescriptionCard";
import PaymentModal from "../components/PaymentModal";
import RecordModal from "../components/RecordModal";
import Navbar from "../components/Navbar";
import { generatePrescriptionPDF } from "../utils/pdfGenerator";

const SPECIALIZATION_TAGS = [
  { label: "Eye doctor", icon: Eye, keywords: ["eye", "ophthalmology", "ophthalmologist", "optometrist", "vision"] },
  { label: "Dentist", icon: Smile, keywords: ["dentist", "dental", "teeth", "orthodontist", "endodontist"] },
  { label: "Cardiologist", icon: Heart, keywords: ["cardiologist", "cardiology", "heart", "cardio", "cardiovascular"] },
  { label: "Skin specialist", icon: Sparkles, keywords: ["skin specialist", "skin", "dermatologist", "dermatology", "derma"] },
  { label: "Orthopedic doctor", icon: Activity, keywords: ["orthopedic doctor", "orthopedic", "orthopedics", "bone", "joint", "spine"] },
  { label: "General physician", icon: Stethoscope, keywords: ["general physician", "physician", "general", "fever", "flu", "gp", "doctor"] },
  { label: "Gynecologist", icon: UserCheck, keywords: ["gynecologist", "gynecology", "women", "ob-gyn", "obstetrics"] },
  { label: "Pediatrician", icon: Heart, keywords: ["pediatrician", "pediatrics", "pediatric", "child", "kids"] },
];

export default function Dashboard() {
  const [currentUser, setCurrentUser] = useState(() => JSON.parse(localStorage.getItem("user") || "{}"));
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [patients, setPatients] = useState([]);
  const [records, setRecords] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [form, setForm] = useState({ doctorId: "", date: "", reason: "" });
  const [payOption, setPayOption] = useState("now");
  const [bookingPaymentMethod, setBookingPaymentMethod] = useState("upi");
  const [message, setMessage] = useState("");
  const [isBooking, setIsBooking] = useState(false);

  // Doctor search & selection state
  const [doctorSearchQuery, setDoctorSearchQuery] = useState("");
  const [activeSpecialization, setActiveSpecialization] = useState("");
  const [bookingDoctor, setBookingDoctor] = useState(null);
  
  // Payment modal state
  const [payingAppointment, setPayingAppointment] = useState(null);

  // Medical Record modal & filter state
  const [showRecordModal, setShowRecordModal] = useState(false);

  // Doctor fee management state
  const [feeInput, setFeeInput] = useState(currentUser.fees !== undefined ? currentUser.fees : 0);
  const [feeMessage, setFeeMessage] = useState("");
  const [feeError, setFeeError] = useState("");
  const [feeSaving, setFeeSaving] = useState(false);

  async function load() {
    try {
      const [a, r, p] = await Promise.all([
        api.get("/appointments"),
        api.get("/records"),
        api.get("/prescriptions")
      ]);
      setAppointments(a.data || []);
      setRecords(r.data || []);
      setPrescriptions(p.data || []);
      if (currentUser?.role === "patient") {
        const d = await api.get("/doctors");
        setDoctors(d.data || []);
      } else if (currentUser?.role === "doctor") {
        try {
          const [docProfile, patsRes] = await Promise.all([
            api.get("/doctors/profile"),
            api.get("/doctors/patients")
          ]);
          if (docProfile.data?.fees !== undefined) {
            setFeeInput(docProfile.data.fees);
            const updated = { ...currentUser, fees: docProfile.data.fees };
            setCurrentUser(updated);
            localStorage.setItem("user", JSON.stringify(updated));
          }
          if (patsRes.data) {
            setPatients(patsRes.data);
          }
        } catch (err) {
          console.error("Could not fetch doctor profile or patients:", err);
        }
      }
    } catch (err) {
      console.error(err);
      if (err.response?.status === 401) {
        localStorage.clear();
        navigate("/login");
      }
    }
  }

  useEffect(() => {
    if (!currentUser || !currentUser.role) {
      localStorage.clear();
      navigate("/login");
      return;
    }
    load().catch(console.error);
  }, []);

  function logout() {
    localStorage.clear();
    navigate("/login");
  }

  function formatPatientName(patient) {
    if (!patient) return "Patient";
    if (patient.name && patient.name.trim() !== "" && patient.name.trim() !== "None") {
      return patient.name;
    }
    if (patient.email) {
      const prefix = patient.email.split("@")[0];
      return prefix.charAt(0).toUpperCase() + prefix.slice(1);
    }
    return "Patient";
  }

  const doctorPatientsList = patients.length > 0 ? patients : Array.from(
    new Map(
      [
        ...appointments.filter(a => a.patient && a.patient._id).map(a => [a.patient._id, a.patient]),
        ...records.filter(r => r.patient && r.patient._id).map(r => [r.patient._id, r.patient])
      ]
    ).values()
  );

  // Handle specialty category change (sync dropdown & cards)
  function handleSpecializationChange(newSpec) {
    setActiveSpecialization(newSpec);
    setForm(prev => ({ ...prev, doctorId: "" }));
    setBookingDoctor(null);
  }

  // Handle doctor selection from dropdown or card
  function handleSelectDoctor(docId) {
    const selectedDoc = doctors.find(d => d._id === docId);
    setForm(prev => ({ ...prev, doctorId: docId }));
    setBookingDoctor(selectedDoc || null);
  }

  async function book(e) {
    e.preventDefault();
    if (isBooking) return;

    if (!form.doctorId) {
      setMessage("Please select a doctor from the dropdown or doctor cards.");
      return;
    }
    if (!form.date) {
      setMessage("Please select an appointment date and time.");
      return;
    }
    if (!form.reason?.trim()) {
      setMessage("Please enter a reason for your visit.");
      return;
    }

    setIsBooking(true);
    try {
      const payload = {
        ...form,
        payNow: payOption === "now",
        paymentMethod: payOption === "now" ? bookingPaymentMethod : "cash"
      };
      await api.post("/appointments", payload);
      setForm({ doctorId: "", date: "", reason: "" });
      setBookingDoctor(null);
      setMessage(payOption === "now" ? "Appointment booked & payment confirmed!" : "Appointment booked. You can pay at the clinic or online anytime.");
      load();
    } catch (err) {
      setMessage(err.response?.data?.message || "Could not book appointment.");
    } finally {
      setIsBooking(false);
    }
  }

  async function updateDoctorFee(e) {
    e.preventDefault();
    setFeeMessage("");
    setFeeError("");
    const parsed = Number(feeInput);
    if (isNaN(parsed) || parsed < 0) {
      setFeeError("Please enter a valid non-negative fee amount.");
      return;
    }

    setFeeSaving(true);
    try {
      const res = await api.put("/doctors/fees", { fees: parsed });
      setFeeMessage(res.data?.message || "Consultation fee updated successfully!");
      const updatedUser = { ...currentUser, fees: parsed };
      setCurrentUser(updatedUser);
      localStorage.setItem("user", JSON.stringify(updatedUser));
    } catch (err) {
      setFeeError(err.response?.data?.message || "Failed to update consultation fee.");
    } finally {
      setFeeSaving(false);
    }
  }

  async function markAsPaid(appointmentId) {
    try {
      await api.patch(`/appointments/${appointmentId}/mark-paid`, { paymentMethod: "cash" });
      setMessage("Appointment marked as paid.");
      load();
    } catch (err) {
      setMessage(err.response?.data?.message || "Could not update payment status.");
    }
  }

  // Filtered doctors list based on active specialization category & search query
  const filteredDoctors = doctors.filter(doc => {
    const matchesSearch = !doctorSearchQuery.trim() || 
      doc.name?.toLowerCase().includes(doctorSearchQuery.toLowerCase()) ||
      doc.specialization?.toLowerCase().includes(doctorSearchQuery.toLowerCase()) ||
      doc.qualification?.toLowerCase().includes(doctorSearchQuery.toLowerCase());

    if (!activeSpecialization) return matchesSearch;

    const specObj = SPECIALIZATION_TAGS.find(s => s.label === activeSpecialization);
    if (!specObj) {
      return matchesSearch && doc.specialization?.toLowerCase().includes(activeSpecialization.toLowerCase());
    }

    const docSpec = (doc.specialization || "").toLowerCase();
    const docQual = (doc.qualification || "").toLowerCase();
    const matchesSpec = specObj.keywords.some(kw => docSpec.includes(kw) || docQual.includes(kw));

    return matchesSearch && matchesSpec;
  });

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <Navbar currentUser={currentUser} onLogout={logout} />

      <main className="container" style={{ flex: 1 }}>
        {/* Hero Banner Header */}
        <section className="hero-banner">
          <div className="eyebrow">Smart Healthcare Portal</div>
          <h1>Welcome back, {currentUser.name}!</h1>
          <p style={{ color: "#94a3b8", fontSize: "15px", margin: "4px 0 0" }}>
            {currentUser.role === "patient" 
              ? "Access certified medical specialists, manage digital prescriptions, and launch HD telemedicine calls."
              : "Manage patient queues, issue digital prescriptions, update consultation fees, and start telemedicine sessions."}
          </p>

          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon-wrapper">
                <Calendar size={22} />
              </div>
              <div className="stat-info">
                <strong>{appointments.length}</strong>
                <span>Appointments</span>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon-wrapper" style={{ color: "#34d399" }}>
                <FileText size={22} />
              </div>
              <div className="stat-info">
                <strong>{prescriptions.length}</strong>
                <span>Active Prescriptions</span>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon-wrapper" style={{ color: "#a78bfa" }}>
                <Activity size={22} />
              </div>
              <div className="stat-info">
                <strong>{records.length}</strong>
                <span>Medical Records</span>
              </div>
            </div>

            {currentUser.role === "doctor" && (
              <div className="stat-card">
                <div className="stat-icon-wrapper" style={{ color: "#fbbf24" }}>
                  <DollarSign size={22} />
                </div>
                <div className="stat-info">
                  <strong>₹{currentUser.fees || 0}</strong>
                  <span>Consultation Fee</span>
                </div>
              </div>
            )}
          </div>
        </section>

        {message && (
          <div className="success" style={{ marginBottom: "24px" }}>
            <CheckCircle2 size={18} />
            <span>{message}</span>
          </div>
        )}

        {/* ====================================================================
           PATIENT PORTAL VIEW
           ==================================================================== */}
        {currentUser.role === "patient" && (
          <div>
            {/* Unified Appointment Booking & Specialist Search Card */}
            <section className="card" style={{ padding: "28px", borderLeft: "4px solid #0284c7" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "12px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <Stethoscope size={22} color="#0284c7" />
                  <div>
                    <h3 style={{ margin: 0, fontSize: "20px", fontWeight: "800", color: "#0f172a" }}>Find Doctors & Book Appointment</h3>
                    <p style={{ margin: "2px 0 0", fontSize: "13px", color: "#64748b" }}>Select a medical requirement (e.g. Eye doctor, Dentist) to filter doctors and book instantly.</p>
                  </div>
                </div>

                <div style={{ position: "relative", width: "min(300px, 100%)" }}>
                  <input
                    type="text"
                    placeholder="Search doctor, degree..."
                    value={doctorSearchQuery}
                    onChange={e => setDoctorSearchQuery(e.target.value)}
                    style={{ paddingLeft: "38px" }}
                  />
                  <Search size={16} color="#94a3b8" style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)" }} />
                </div>
              </div>

              {/* Interactive Unified Booking Form */}
              <form onSubmit={book} style={{ background: "#f8fafc", padding: "20px", borderRadius: "16px", border: "1px solid #e2e8f0" }}>
                {/* Step 1: Specialization Visual Cards */}
                <label style={{ fontSize: "13px", fontWeight: "700", color: "#334155", marginBottom: "10px", display: "block" }}>
                  1. Choose Medical Requirement / Category
                </label>
                <div className="specialty-grid" style={{ marginBottom: "24px" }}>
                  <div
                    className={`spec-card ${activeSpecialization === "" ? "active" : ""}`}
                    onClick={() => handleSpecializationChange("")}
                  >
                    <div className="spec-icon">
                      <Filter size={18} />
                    </div>
                    <span>All Doctors</span>
                  </div>
                  {SPECIALIZATION_TAGS.map((s, idx) => {
                    const IconComp = s.icon;
                    return (
                      <div
                        key={idx}
                        className={`spec-card ${activeSpecialization === s.label ? "active" : ""}`}
                        onClick={() => handleSpecializationChange(activeSpecialization === s.label ? "" : s.label)}
                      >
                        <div className="spec-icon">
                          <IconComp size={18} />
                        </div>
                        <span>{s.label}</span>
                      </div>
                    );
                  })}
                </div>

                {/* Step 2: Schedule & Doctor Details */}
                <label style={{ fontSize: "13px", fontWeight: "700", color: "#334155", marginBottom: "10px", display: "block" }}>
                  2. Select Doctor & Schedule Details {activeSpecialization ? `(Filtered for ${activeSpecialization})` : ""}
                </label>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px", marginBottom: "16px" }}>
                  {/* Specialty Category Dropdown */}
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>Filter Specialty</label>
                    <select
                      value={activeSpecialization}
                      onChange={e => handleSpecializationChange(e.target.value)}
                      style={{ height: "46px" }}
                    >
                      <option value="">-- All Specializations --</option>
                      {SPECIALIZATION_TAGS.map((s, idx) => (
                        <option key={idx} value={s.label}>{s.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Filtered Doctor Select Dropdown */}
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>Select Doctor</label>
                    <select
                      required
                      value={form.doctorId}
                      onChange={e => handleSelectDoctor(e.target.value)}
                      style={{ height: "46px" }}
                    >
                      <option value="">
                        {activeSpecialization 
                          ? `-- Select ${activeSpecialization} (${filteredDoctors.length} available) --`
                          : `-- Select Specialist Doctor (${filteredDoctors.length} available) --`}
                      </option>
                      {filteredDoctors.map(d => (
                        <option key={d._id} value={d._id}>
                          Dr. {d.name} — {d.specialization || "General Physician"} (Fee: ₹{d.fees || 0})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Date & Time Picker */}
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>Appointment Date & Time</label>
                    <input
                      type="datetime-local"
                      required
                      value={form.date}
                      onChange={e => setForm({ ...form, date: e.target.value })}
                      style={{ height: "46px" }}
                    />
                  </div>

                  {/* Payment Choice */}
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>Payment Option</label>
                    <select
                      value={payOption}
                      onChange={e => setPayOption(e.target.value)}
                      style={{ height: "46px" }}
                    >
                      <option value="now">Pay Online Now {bookingDoctor ? `(₹${bookingDoctor.fees || 0})` : ""}</option>
                      <option value="clinic">Pay Later at Clinic Desk</option>
                    </select>
                  </div>
                </div>

                {/* Selected Doctor Highlight Summary */}
                {bookingDoctor && (
                  <div style={{ background: "#ffffff", border: "1.5px solid #0284c7", padding: "14px 18px", borderRadius: "12px", marginBottom: "16px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px", boxShadow: "0 4px 12px rgba(2, 132, 199, 0.08)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      <div className="doc-avatar" style={{ width: "42px", height: "42px", fontSize: "16px" }}>
                        {bookingDoctor.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <strong style={{ color: "#0f172a", fontSize: "15px" }}>Dr. {bookingDoctor.name}</strong>
                        <span style={{ color: "#0284c7", fontSize: "13px", fontWeight: "600", marginLeft: "8px" }}>
                          ({bookingDoctor.specialization || "General Physician"})
                        </span>
                        <div style={{ fontSize: "12px", color: "#64748b" }}>
                          Degree: {bookingDoctor.qualification || "MBBS"} • Reg: {bookingDoctor.medicalRegNo || "Verified"}
                        </div>
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <span style={{ fontSize: "11px", color: "#64748b", textTransform: "uppercase", fontWeight: "700" }}>Consultation Fee</span>
                      <div className="fee-badge" style={{ fontSize: "18px" }}>₹{bookingDoctor.fees || 0}</div>
                    </div>
                  </div>
                )}

                {/* Reason Field */}
                <div className="form-group" style={{ marginBottom: "16px" }}>
                  <label>Reason for Visit / Symptoms</label>
                  <textarea
                    rows="2"
                    required
                    placeholder="Describe symptoms, medical query, or checkup reason..."
                    value={form.reason}
                    onChange={e => setForm({ ...form, reason: e.target.value })}
                  />
                </div>

                {/* Online Payment Method Selector */}
                {payOption === "now" && (
                  <div style={{ background: "#ffffff", padding: "14px", borderRadius: "12px", border: "1px solid #e2e8f0", marginBottom: "16px" }}>
                    <label style={{ fontSize: "13px", fontWeight: "700", color: "#0369a1", marginBottom: "8px", display: "block" }}>
                      Online Payment Gateway
                    </label>
                    <div style={{ display: "flex", gap: "10px" }}>
                      {["upi", "card", "netbanking"].map(m => (
                        <button
                          key={m}
                          type="button"
                          className={`secondary-btn ${bookingPaymentMethod === m ? "primary" : ""}`}
                          onClick={() => setBookingPaymentMethod(m)}
                          style={{ padding: "8px 16px", fontSize: "12px", textTransform: "uppercase", fontWeight: "700" }}
                        >
                          {m}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <button type="submit" className="primary" disabled={isBooking} style={{ padding: "14px 32px", fontSize: "15px", opacity: isBooking ? 0.6 : 1 }}>
                  <Calendar size={18} />
                  <span>{isBooking ? "Booking Appointment..." : "Confirm & Schedule Appointment"}</span>
                </button>
              </form>

              {/* Visual Doctor Cards for Selected Category */}
              <div style={{ marginTop: "28px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                  <h4 style={{ margin: 0, fontSize: "16px", fontWeight: "700", color: "#0f172a" }}>
                    {activeSpecialization ? `${activeSpecialization} Specialists` : "All Specialist Doctors"} ({filteredDoctors.length})
                  </h4>
                </div>

                <div className="doctor-cards-grid">
                  {filteredDoctors.length === 0 ? (
                    <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: "40px", background: "#f8fafc", borderRadius: "14px", border: "1px dashed #cbd5e1" }}>
                      <Stethoscope size={36} color="#94a3b8" style={{ marginBottom: "8px" }} />
                      <p style={{ fontWeight: "700", color: "#475569" }}>No {activeSpecialization || "specialist"} doctors found</p>
                      <p style={{ fontSize: "13px", color: "#94a3b8" }}>Try selecting another specialty category or clearing the search box.</p>
                    </div>
                  ) : (
                    filteredDoctors.map(doc => (
                      <div
                        key={doc._id}
                        className={`doctor-card ${form.doctorId === doc._id ? "selected" : ""}`}
                        style={{
                          border: form.doctorId === doc._id ? "2px solid #0284c7" : "1px solid #e2e8f0",
                          background: form.doctorId === doc._id ? "#f0f9ff" : "#ffffff",
                          boxShadow: form.doctorId === doc._id ? "0 8px 25px rgba(2, 132, 199, 0.15)" : undefined
                        }}
                      >
                        <div>
                          <div className="doc-header">
                            <div className="doc-avatar">
                              {doc.name.charAt(0).toUpperCase()}
                            </div>
                            <div style={{ flex: 1 }}>
                              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                <div className="doc-name">{doc.name}</div>
                                <span style={{ background: "#dcfce7", color: "#15803d", fontSize: "10px", fontWeight: "800", padding: "2px 8px", borderRadius: "12px", border: "1px solid #bbf7d0" }}>
                                  ● Available
                                </span>
                              </div>
                              <div className="doc-spec">{doc.specialization || "General Physician"}</div>
                              <div style={{ fontSize: "12px", color: "#64748b", marginTop: "3px", display: "flex", gap: "8px", alignItems: "center" }}>
                                <span>{doc.qualification || "MBBS"}</span>
                                <span>•</span>
                                <span>{doc.experience || "5+ yrs exp"}</span>
                                <span>•</span>
                                <span style={{ color: "#d97706", fontWeight: "700" }}>★ 4.9</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="doc-footer">
                          <div>
                            <span style={{ fontSize: "11px", color: "#64748b", textTransform: "uppercase", fontWeight: "800", letterSpacing: "0.5px", display: "block" }}>Consultation Fee</span>
                            <span className="fee-badge">₹{doc.fees || 0}</span>
                          </div>
                          <button
                            type="button"
                            className={form.doctorId === doc._id ? "success-btn" : "primary"}
                            onClick={() => handleSelectDoctor(doc._id)}
                            style={{ padding: "8px 18px", fontSize: "13px", borderRadius: "10px" }}
                          >
                            <span>{form.doctorId === doc._id ? "Selected ✓" : "Book Doctor"}</span>
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </section>

            {/* Patient Appointments Table */}
            <section className="card">
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
                <Calendar size={20} color="#0284c7" />
                <h3 style={{ margin: 0, fontSize: "18px" }}>My Scheduled Appointments</h3>
              </div>

              {appointments.length === 0 ? (
                <p style={{ color: "#64748b", fontSize: "14px" }}>No appointments scheduled yet. Select a doctor above to book one.</p>
              ) : (
                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>Doctor</th>
                        <th>Specialty</th>
                        <th>Date & Time</th>
                        <th>Reason</th>
                        <th>Status</th>
                        <th>Payment</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {appointments.map(a => (
                        <tr key={a._id}>
                          <td><strong>{a.doctor?.name || "Doctor"}</strong></td>
                          <td><span className="badge-pill-header">{a.doctor?.specialization || "General"}</span></td>
                          <td>{new Date(a.date).toLocaleString()}</td>
                          <td>{a.reason}</td>
                          <td>
                            <span className={`badge ${a.status || "scheduled"}`}>
                              {a.status?.toUpperCase() || "SCHEDULED"}
                            </span>
                          </td>
                          <td>
                            {a.paymentStatus === "paid" ? (
                              <span className="badge completed">✓ Paid (₹{a.fee})</span>
                            ) : (
                              <button
                                className="primary"
                                style={{ padding: "4px 10px", fontSize: "11px" }}
                                onClick={() => setPayingAppointment(a)}
                              >
                                Pay ₹{a.fee}
                              </button>
                            )}
                          </td>
                          <td>
                            <button
                              className="secondary-btn"
                              onClick={() => navigate(`/telemedicine/${a._id}`)}
                              style={{ padding: "6px 12px", fontSize: "12px" }}
                            >
                              <Video size={14} color="#0284c7" />
                              <span>Join Video Call</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            {/* Prescriptions & Medical Records Section */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
              <section className="card">
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
                  <FileText size={20} color="#059669" />
                  <h3 style={{ margin: 0, fontSize: "18px" }}>My Prescriptions</h3>
                </div>

                {prescriptions.length === 0 ? (
                  <p style={{ color: "#64748b", fontSize: "14px" }}>No prescriptions issued yet.</p>
                ) : (
                  prescriptions.map(p => (
                    <PrescriptionCard key={p._id} prescription={p} />
                  ))
                )}
              </section>

              <section className="card">
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
                  <Activity size={20} color="#6366f1" />
                  <h3 style={{ margin: 0, fontSize: "18px" }}>My Medical Records</h3>
                </div>

                {records.length === 0 ? (
                  <p style={{ color: "#64748b", fontSize: "14px" }}>No medical records uploaded yet.</p>
                ) : (
                  records.map(r => (
                    <div key={r._id} style={{ background: "#f8fafc", border: "1px solid #e2e8f0", padding: "14px", borderRadius: "12px", marginBottom: "10px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <strong style={{ fontSize: "15px", color: "#0f172a" }}>{r.title}</strong>
                        <span className="badge-pill-header">{r.category}</span>
                      </div>
                      <p style={{ fontSize: "13px", color: "#64748b", margin: "6px 0" }}>{r.description}</p>
                      {r.vitals && (
                        <div style={{ display: "flex", gap: "10px", fontSize: "11px", color: "#0369a1", marginTop: "6px", flexWrap: "wrap" }}>
                          {r.vitals.bloodPressure && <span>BP: {r.vitals.bloodPressure}</span>}
                          {r.vitals.heartRate && <span>HR: {r.vitals.heartRate}</span>}
                          {r.vitals.temperature && <span>Temp: {r.vitals.temperature}</span>}
                          {r.vitals.bloodSugar && <span>Sugar: {r.vitals.bloodSugar}</span>}
                        </div>
                      )}
                      <div style={{ marginTop: "10px", textAlign: "right" }}>
                        <button
                          type="button"
                          className="secondary-btn"
                          style={{ padding: "4px 10px", fontSize: "11px", display: "inline-flex", alignItems: "center", gap: "4px" }}
                          onClick={() => {
                            generatePrescriptionPDF({
                              doctorName: r.doctor?.name || "Attending Doctor",
                              doctorSpecialization: r.doctor?.specialization || "Medical Specialist",
                              patientName: formatPatientName(r.patient),
                              patientEmail: r.patient?.email || "",
                              diagnosis: `${r.category}: ${r.title}`,
                              medicines: [],
                              instructions: `${r.description}${r.vitals ? `\n\nVitals: BP: ${r.vitals.bloodPressure || "-"}, HR: ${r.vitals.heartRate || "-"}, Temp: ${r.vitals.temperature || "-"}, Sugar: ${r.vitals.bloodSugar || "-"}` : ""}`,
                              date: r.date || r.createdAt,
                              prescriptionId: r._id
                            });
                          }}
                        >
                          <Download size={12} />
                          <span>Save PDF Note</span>
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </section>
            </div>
          </div>
        )}

        {/* ====================================================================
           DOCTOR PORTAL VIEW
           ==================================================================== */}
        {currentUser.role === "doctor" && (
          <div>
            {/* Consultation Fee Manager Card */}
            <section className="card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: "18px", color: "#0f172a" }}>Consultation Fee Settings</h3>
                  <p style={{ margin: "2px 0 0", fontSize: "13px", color: "#64748b" }}>Set your standard appointment fee shown to booking patients.</p>
                </div>

                <form onSubmit={updateDoctorFee} style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                  <div style={{ position: "relative" }}>
                    <span style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", fontWeight: "700", color: "#64748b" }}>₹</span>
                    <input
                      type="number"
                      min="0"
                      value={feeInput}
                      onChange={e => setFeeInput(e.target.value)}
                      style={{ paddingLeft: "26px", width: "120px" }}
                    />
                  </div>
                  <button type="submit" className="primary" disabled={feeSaving}>
                    {feeSaving ? "Saving..." : "Update Fee"}
                  </button>
                </form>
              </div>

              {feeMessage && <div className="success" style={{ marginTop: "12px", margin: "12px 0 0" }}>{feeMessage}</div>}
              {feeError && <div className="error" style={{ marginTop: "12px", margin: "12px 0 0" }}>{feeError}</div>}
            </section>

            {/* Patient Appointments Queue */}
            <section className="card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <UserCheck size={20} color="#0284c7" />
                  <h3 style={{ margin: 0, fontSize: "18px" }}>Patient Appointments Queue</h3>
                </div>

                <button className="primary" onClick={() => setShowRecordModal(true)} style={{ padding: "8px 14px", fontSize: "13px" }}>
                  <Plus size={16} />
                  <span>Add Patient Record</span>
                </button>
              </div>

              {appointments.length === 0 ? (
                <p style={{ color: "#64748b", fontSize: "14px" }}>No patient appointments in queue.</p>
              ) : (
                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>Patient</th>
                        <th>Date & Time</th>
                        <th>Reason</th>
                        <th>Fee</th>
                        <th>Payment Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {appointments.map(a => (
                        <tr key={a._id}>
                          <td><strong>{formatPatientName(a.patient)}</strong> <br /><span style={{ fontSize: "12px", color: "#64748b" }}>{a.patient?.email}</span></td>
                          <td>{new Date(a.date).toLocaleString()}</td>
                          <td>{a.reason}</td>
                          <td>₹{a.fee}</td>
                          <td>
                            {a.paymentStatus === "paid" ? (
                              <span className="badge completed">✓ Paid</span>
                            ) : (
                              <button className="secondary-btn" style={{ padding: "4px 8px", fontSize: "11px" }} onClick={() => markAsPaid(a._id)}>
                                Mark Paid (Cash)
                              </button>
                            )}
                          </td>
                          <td>
                            <div style={{ display: "flex", gap: "6px" }}>
                              <button
                                className="primary"
                                onClick={() => navigate(`/telemedicine/${a._id}`)}
                                style={{ padding: "6px 12px", fontSize: "12px" }}
                              >
                                <Video size={14} />
                                <span>Start Video Room</span>
                              </button>
                              <button
                                className="secondary-btn"
                                onClick={() => navigate(`/appointment/${a._id}`)}
                                style={{ padding: "6px 12px", fontSize: "12px", background: "#f0f9ff", border: "1px solid #bae6fd", color: "#0284c7", display: "flex", alignItems: "center", gap: "4px" }}
                              >
                                <FileText size={14} />
                                <span>Issue Rx</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>
        )}

        {/* Modals */}
        {payingAppointment && (
          <PaymentModal
            appointment={payingAppointment}
            onClose={() => setPayingAppointment(null)}
            onPaymentSuccess={() => {
              setPayingAppointment(null);
              load();
            }}
          />
        )}

        {showRecordModal && (
          <RecordModal
            patients={doctorPatientsList}
            onClose={() => setShowRecordModal(false)}
            onSuccess={() => {
              setShowRecordModal(false);
              load();
            }}
          />
        )}
      </main>
    </div>
  );
}
