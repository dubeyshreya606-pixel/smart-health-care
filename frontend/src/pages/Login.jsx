import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ShieldCheck, User, Stethoscope, Mail, Lock, ArrowRight } from "lucide-react";
import api from "../api";
import HumanVerification from "../components/HumanVerification";

export default function Login() {
  const [role, setRole] = useState("patient");
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [humanVerified, setHumanVerified] = useState(false);
  const [humanToken, setHumanToken] = useState(null);
  const navigate = useNavigate();

  function selectRole(newRole) {
    setRole(newRole);
    setError("");
  }

  async function submit(e) {
    e.preventDefault();
    setError("");

    if (!humanVerified) {
      setError("Please complete the Human Verification CAPTCHA check.");
      return;
    }

    try {
      const { data } = await api.post("/auth/login", {
        ...form,
        role,
        humanVerificationToken: humanToken
      });

      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      if (data.user.role === "admin") {
        navigate("/admin");
      } else {
        navigate("/");
      }
    } catch (err) {
      if (!err.response) {
        setError("Cannot connect to backend server. Make sure the backend is running.");
      } else {
        setError(err.response?.data?.message || "Login failed. Please check your credentials or register first.");
      }
    }
  }

  return (
    <main className="auth-page fade-in">
      <div className="auth-container" style={{ gridTemplateColumns: "1fr", maxWidth: "460px" }}>
        {/* Active Form Container */}
        <form className="auth-card" onSubmit={submit}>
          <h1>Welcome back</h1>
          <p className="muted" style={{ fontSize: "14px", color: "#64748b", marginBottom: "8px" }}>
            Select your account portal and log in to continue.
          </p>

          <div className="role-tabs">
            <button
              type="button"
              className={`role-tab-btn ${role === "patient" ? "active" : ""}`}
              onClick={() => selectRole("patient")}
            >
              <User size={15} />
              <span>Patient</span>
            </button>
            <button
              type="button"
              className={`role-tab-btn ${role === "doctor" ? "active" : ""}`}
              onClick={() => selectRole("doctor")}
            >
              <Stethoscope size={15} />
              <span>Doctor</span>
            </button>
            <button
              type="button"
              className={`role-tab-btn ${role === "admin" ? "active" : ""}`}
              onClick={() => selectRole("admin")}
            >
              <ShieldCheck size={15} />
              <span>Admin</span>
            </button>
          </div>

          {error && <div className="error">{error}</div>}

          <div className="form-group">
            <label>
              {role === "patient" ? "Patient Email Address" : role === "doctor" ? "Doctor Email Address" : "Admin Gmail Address"}
            </label>
            <div style={{ position: "relative" }}>
              <input
                placeholder={role === "admin" ? "admin@healthcare.com" : role === "patient" ? "patient@example.com" : "doctor@example.com"}
                type="email"
                required
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                style={{ paddingLeft: "40px" }}
              />
              <Mail size={18} color="#94a3b8" style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)" }} />
            </div>
          </div>

          <div className="form-group">
            <label>Password</label>
            <div style={{ position: "relative" }}>
              <input
                placeholder="Enter password"
                type="password"
                required
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                style={{ paddingLeft: "40px" }}
              />
              <Lock size={18} color="#94a3b8" style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)" }} />
            </div>
          </div>

          {/* Human Verification Security Check */}
          <HumanVerification
            onVerify={(isOk, token) => {
              setHumanVerified(isOk);
              setHumanToken(token);
            }}
          />

          <button className="primary" style={{ width: "100%", marginTop: "12px", padding: "14px" }} disabled={!humanVerified}>
            <span>Log in as {role === "patient" ? "Patient" : role === "doctor" ? "Doctor" : "Administrator"}</span>
            <ArrowRight size={17} />
          </button>

          {role !== "admin" && (
            <p style={{ marginTop: "20px", textAlign: "center", fontSize: "14px", color: "#64748b" }}>
              New to Smart Healthcare?{" "}
              <Link to="/register" style={{ color: "#0284c7", fontWeight: "700", textDecoration: "none" }}>
                Create an account
              </Link>
            </p>
          )}
        </form>
      </div>
    </main>
  );
}
