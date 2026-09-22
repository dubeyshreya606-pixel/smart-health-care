import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ShieldCheck, Stethoscope, Users, Calendar, Ban, CheckCircle2, Clock, Search, Trash2, Eye, Globe, LogOut, X, Activity, UserCheck, AlertTriangle } from "lucide-react";
import api from "../api";

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState("overview");
  const [stats, setStats] = useState(null);
  const [doctors, setDoctors] = useState([]);
  const [patients, setPatients] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [docFilter, setDocFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [alertMsg, setAlertMsg] = useState({ type: "", text: "" });
  const [selectedUser, setSelectedUser] = useState(null);

  const navigate = useNavigate();
  const currentUser = JSON.parse(localStorage.getItem("user") || "{}");

  useEffect(() => {
    if (currentUser.role !== "admin") {
      navigate("/login");
      return;
    }
    loadDashboardData();
  }, [activeTab, docFilter]);

  async function loadDashboardData() {
    setLoading(true);
    try {
      if (activeTab === "overview" || activeTab === "profile") {
        const { data } = await api.get("/admin/stats");
        setStats(data);
      } else if (activeTab === "applications") {
        const { data } = await api.get("/admin/doctors?status=pending");
        setDoctors(data);
      } else if (activeTab === "doctors") {
        const { data } = await api.get(`/admin/doctors?status=${docFilter}&search=${encodeURIComponent(searchQuery)}`);
        setDoctors(data);
      } else if (activeTab === "patients") {
        const { data } = await api.get(`/admin/patients?search=${encodeURIComponent(searchQuery)}`);
        setPatients(data);
      } else if (activeTab === "appointments") {
        const { data } = await api.get("/appointments");
        setAppointments(data);
      } else if (activeTab === "blocked") {
        const [docsRes, patsRes] = await Promise.all([
          api.get("/admin/doctors?status=blocked"),
          api.get("/admin/patients?blockedOnly=true")
        ]);
        setDoctors(docsRes.data);
        setPatients(patsRes.data);
      }
    } catch (err) {
      setAlertMsg({
        type: "error",
        text: err.response?.data?.message || "Failed to fetch admin data."
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleSearch(e) {
    e.preventDefault();
    loadDashboardData();
  }

  async function handleApproveDoctor(id, newStatus) {
    try {
      const { data } = await api.put(`/admin/doctors/${id}/approval`, { status: newStatus });
      setAlertMsg({ type: "success", text: data.message });
      loadDashboardData();
      if (selectedUser?._id === id) setSelectedUser(null);
    } catch (err) {
      setAlertMsg({ type: "error", text: err.response?.data?.message || "Action failed." });
    }
  }

  async function handleToggleBlock(id, currentIsBlocked) {
    try {
      const { data } = await api.put(`/admin/users/${id}/block`, { isBlocked: !currentIsBlocked });
      setAlertMsg({ type: "success", text: data.message });
      loadDashboardData();
      if (selectedUser?._id === id) setSelectedUser(null);
    } catch (err) {
      setAlertMsg({ type: "error", text: err.response?.data?.message || "Action failed." });
    }
  }

  async function handleDeleteUser(id, name) {
    if (!window.confirm(`Are you sure you want to permanently delete user "${name}"? This action cannot be undone.`)) {
      return;
    }
    try {
      const { data } = await api.delete(`/admin/users/${id}`);
      setAlertMsg({ type: "success", text: data.message });
      loadDashboardData();
      if (selectedUser?._id === id) setSelectedUser(null);
    } catch (err) {
      setAlertMsg({ type: "error", text: err.response?.data?.message || "Deletion failed." });
    }
  }

  function handleLogout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc" }}>
      {/* Header */}
      <header className="topbar">
        <div className="brand-section">
          <div className="logo-badge">
            <ShieldCheck size={22} color="#ffffff" />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: "18px", fontWeight: "800", color: "#0f172a" }}>Admin Control Suite</h2>
            <span style={{ fontSize: "12px", color: "#64748b" }}>Logged in: <strong>{currentUser.email || "System Admin"}</strong></span>
          </div>
        </div>

        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <button className="secondary-btn" onClick={() => navigate("/")}>
            <Globe size={16} />
            <span>View Main Site</span>
          </button>
          <button className="danger" onClick={handleLogout}>
            <LogOut size={16} />
            <span>Logout</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <div className="container" style={{ marginTop: "24px" }}>
        {/* Navigation Tabs Bar */}
        <div style={{ display: "flex", gap: "8px", background: "#ffffff", padding: "8px", borderRadius: "16px", border: "1px solid #e2e8f0", marginBottom: "24px", overflowX: "auto" }}>
          <button
            className={`role-tab-btn ${activeTab === "overview" ? "active" : ""}`}
            onClick={() => setActiveTab("overview")}
          >
            <Activity size={16} />
            <span>Overview</span>
          </button>
          <button
            className={`role-tab-btn ${activeTab === "applications" ? "active" : ""}`}
            onClick={() => setActiveTab("applications")}
          >
            <Clock size={16} />
            <span>Doctor Applications {stats?.pendingDoctors > 0 && `(${stats.pendingDoctors})`}</span>
          </button>
          <button
            className={`role-tab-btn ${activeTab === "doctors" ? "active" : ""}`}
            onClick={() => setActiveTab("doctors")}
          >
            <Stethoscope size={16} />
            <span>All Doctors</span>
          </button>
          <button
            className={`role-tab-btn ${activeTab === "patients" ? "active" : ""}`}
            onClick={() => setActiveTab("patients")}
          >
            <Users size={16} />
            <span>All Patients</span>
          </button>
          <button
            className={`role-tab-btn ${activeTab === "appointments" ? "active" : ""}`}
            onClick={() => setActiveTab("appointments")}
          >
            <Calendar size={16} />
            <span>All Appointments</span>
          </button>
          <button
            className={`role-tab-btn ${activeTab === "blocked" ? "active" : ""}`}
            onClick={() => setActiveTab("blocked")}
          >
            <Ban size={16} />
            <span>Blocked Users</span>
          </button>
        </div>

        {alertMsg.text && (
          <div className={alertMsg.type === "error" ? "error" : "success"} style={{ marginBottom: "20px" }}>
            <span>{alertMsg.text}</span>
            <button onClick={() => setAlertMsg({ type: "", text: "" })} style={{ background: "transparent", border: "none", cursor: "pointer", marginLeft: "auto" }}>
              <X size={16} />
            </button>
          </div>
        )}

        {/* TAB 1: OVERVIEW */}
        {activeTab === "overview" && (
          <div className="stats-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
            <div className="card" style={{ borderLeft: "4px solid #0284c7" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "13px", color: "#64748b", fontWeight: "600" }}>Total Doctors</span>
                <Stethoscope size={20} color="#0284c7" />
              </div>
              <strong style={{ fontSize: "32px", fontWeight: "800", color: "#0f172a", display: "block", margin: "8px 0 4px" }}>{stats?.totalDoctors ?? 0}</strong>
              <span style={{ fontSize: "12px", color: "#64748b" }}>Registered medical professionals</span>
            </div>

            <div className="card" style={{ borderLeft: "4px solid #f59e0b" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "13px", color: "#64748b", fontWeight: "600" }}>Pending Applications</span>
                <Clock size={20} color="#f59e0b" />
              </div>
              <strong style={{ fontSize: "32px", fontWeight: "800", color: "#0f172a", display: "block", margin: "8px 0 4px" }}>{stats?.pendingDoctors ?? 0}</strong>
              <span style={{ fontSize: "12px", color: "#64748b" }}>Awaiting license review</span>
            </div>

            <div className="card" style={{ borderLeft: "4px solid #10b981" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "13px", color: "#64748b", fontWeight: "600" }}>Approved Doctors</span>
                <CheckCircle2 size={20} color="#10b981" />
              </div>
              <strong style={{ fontSize: "32px", fontWeight: "800", color: "#0f172a", display: "block", margin: "8px 0 4px" }}>{stats?.approvedDoctors ?? 0}</strong>
              <span style={{ fontSize: "12px", color: "#64748b" }}>Verified active specialists</span>
            </div>

            <div className="card" style={{ borderLeft: "4px solid #6366f1" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "13px", color: "#64748b", fontWeight: "600" }}>Total Patients</span>
                <Users size={20} color="#6366f1" />
              </div>
              <strong style={{ fontSize: "32px", fontWeight: "800", color: "#0f172a", display: "block", margin: "8px 0 4px" }}>{stats?.totalPatients ?? 0}</strong>
              <span style={{ fontSize: "12px", color: "#64748b" }}>Registered patient accounts</span>
            </div>
          </div>
        )}

        {/* TAB 2: DOCTOR APPLICATIONS */}
        {activeTab === "applications" && (
          <section className="card">
            <h3 style={{ margin: "0 0 16px", fontSize: "18px" }}>Pending Doctor Verification Applications</h3>
            {doctors.length === 0 ? (
              <p style={{ color: "#64748b" }}>No pending doctor applications awaiting review.</p>
            ) : (
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Doctor</th>
                      <th>Specialty</th>
                      <th>Reg No</th>
                      <th>Exp</th>
                      <th>Fee</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {doctors.map(d => (
                      <tr key={d._id}>
                        <td><strong>{d.name}</strong><br /><span style={{ fontSize: "12px", color: "#64748b" }}>{d.email}</span></td>
                        <td><span className="badge-pill-header">{d.specialization}</span></td>
                        <td>{d.medicalRegNo}</td>
                        <td>{d.experience}</td>
                        <td>₹{d.fees}</td>
                        <td>
                          <div style={{ display: "flex", gap: "6px" }}>
                            <button className="success-btn" style={{ padding: "6px 12px", fontSize: "12px" }} onClick={() => handleApproveDoctor(d._id, "approved")}>
                              Approve
                            </button>
                            <button className="danger" style={{ padding: "6px 12px", fontSize: "12px" }} onClick={() => handleApproveDoctor(d._id, "rejected")}>
                              Reject
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
        )}

        {/* TAB 3 & 4: DOCTORS & PATIENTS LIST */}
        {(activeTab === "doctors" || activeTab === "patients") && (
          <section className="card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "12px" }}>
              <h3 style={{ margin: 0, fontSize: "18px" }}>{activeTab === "doctors" ? "Registered Doctor Directory" : "Registered Patients Directory"}</h3>
              <form onSubmit={handleSearch} style={{ display: "flex", gap: "8px" }}>
                <input
                  placeholder="Search name, email..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  style={{ width: "220px" }}
                />
                <button type="submit" className="primary" style={{ padding: "0 16px" }}>
                  <Search size={16} />
                </button>
              </form>
            </div>

            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {(activeTab === "doctors" ? doctors : patients).map(u => (
                    <tr key={u._id}>
                      <td><strong>{u.name}</strong></td>
                      <td>{u.email}</td>
                      <td>{u.phone || "-"}</td>
                      <td>
                        <span className={`badge ${u.isBlocked ? "cancelled" : "completed"}`}>
                          {u.isBlocked ? "BLOCKED" : "ACTIVE"}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: "6px" }}>
                          <button
                            className={u.isBlocked ? "success-btn" : "secondary-btn"}
                            style={{ padding: "6px 12px", fontSize: "12px" }}
                            onClick={() => handleToggleBlock(u._id, u.isBlocked)}
                          >
                            {u.isBlocked ? "Unblock" : "Block User"}
                          </button>
                          <button
                            className="danger"
                            style={{ padding: "6px 12px", fontSize: "12px" }}
                            onClick={() => handleDeleteUser(u._id, u.name)}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
