import { useRef, useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getAuth, RecaptchaVerifier, signInWithPhoneNumber, signOut } from "firebase/auth";
import { Activity, ShieldAlert, User, Stethoscope, Mail, Lock, Phone, ArrowRight, CheckCircle2, FileText, Video, Sparkles, Award } from "lucide-react";
import api from "../api";
import { firebaseApp, firebaseConfigured } from "../firebase";
import HumanVerification from "../components/HumanVerification";

export default function Register() {
  const [form, setForm] = useState({
    name: "", email: "", password: "", role: "patient",
    phone: "+91", specialization: "", qualification: "", medicalRegNo: "", experience: "", fees: "",
    age: "", gender: "Male"
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [firebaseToken, setFirebaseToken] = useState("");
  
  // Human Verification CAPTCHA state
  const [humanVerified, setHumanVerified] = useState(false);
  const [humanToken, setHumanToken] = useState(null);

  const confirmationResult = useRef(null);
  const recaptchaVerifier = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    return () => {
      if (recaptchaVerifier.current) {
        try { recaptchaVerifier.current.clear(); } catch (e) {}
        recaptchaVerifier.current = null;
      }
    };
  }, []);

  function updatePhone(value) {
    const digits = value.replace(/\D/g, "");
    const localNumber = digits.startsWith("91") ? digits.slice(2) : digits;
    setForm({ ...form, phone: `+91${localNumber.slice(0, 10)}` });
    resetPhoneVerification();
  }

  function resetPhoneVerification() {
    confirmationResult.current = null;
    setOtp("");
    setOtpSent(false);
    setPhoneVerified(false);
    setFirebaseToken("");
  }

  async function sendOtp() {
    setError("");
    setSuccess("");

    if (!humanVerified) {
      setError("Please complete the Human Verification CAPTCHA first.");
      return;
    }

    if (!/^\+[1-9]\d{7,14}$/.test(form.phone)) {
      setError("Enter the phone number in international format, for example +919876543210.");
      return;
    }

    setSendingOtp(true);
    try {
      if (firebaseConfigured && firebaseApp) {
        const auth = getAuth(firebaseApp);
        if (recaptchaVerifier.current) {
          try { recaptchaVerifier.current.clear(); } catch (e) {}
          recaptchaVerifier.current = null;
        }

        recaptchaVerifier.current = new RecaptchaVerifier(auth, "recaptcha-container", {
          size: "normal",
          callback: () => {},
          "expired-callback": () => {
            setError("reCAPTCHA expired. Please resend OTP.");
          }
        });

        confirmationResult.current = await signInWithPhoneNumber(auth, form.phone, recaptchaVerifier.current);
        setOtpSent(true);
        setSuccess("OTP sent successfully to your phone. Please verify it below.");
      } else {
        // Fallback dev mode when Firebase credentials are not provided
        console.warn("Firebase not configured - using Dev/Demo OTP verification.");
        setOtpSent(true);
        setSuccess("Demo Mode: OTP sent! Enter '123456' to verify.");
      }
    } catch (err) {
      if (recaptchaVerifier.current) {
        try { recaptchaVerifier.current.clear(); } catch (e) {}
        recaptchaVerifier.current = null;
      }
      setError(err.message || "Could not send OTP.");
    } finally {
      setSendingOtp(false);
    }
  }

  async function verifyOtp() {
    setError("");
    setVerifyingOtp(true);
    try {
      if (confirmationResult.current) {
        const result = await confirmationResult.current.confirm(otp);
        const token = await result.user.getIdToken();
        setFirebaseToken(token);
      } else {
        // Fallback dev mode check
        if (otp === "123456" || otp.length === 6) {
          setFirebaseToken("dev_verified_phone_token");
        } else {
          throw new Error("Invalid OTP code. For demo mode, enter 123456.");
        }
      }
      setPhoneVerified(true);
      setSuccess("Phone number verified successfully! You can now submit your registration.");
    } catch (err) {
      setError(err.message || "Invalid OTP code.");
    } finally {
      setVerifyingOtp(false);
    }
  }

  async function submit(e) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!humanVerified || !humanToken) {
      setError("Please complete the Human Verification CAPTCHA check.");
      return;
    }

    if (!phoneVerified) {
      setError("Please verify your phone number with the OTP before submitting.");
      return;
    }

    try {
      let activeToken = firebaseToken;
      if (!activeToken && firebaseConfigured && firebaseApp && getAuth(firebaseApp).currentUser) {
        activeToken = await getAuth(firebaseApp).currentUser.getIdToken();
      }
      if (!activeToken) {
        activeToken = "dev_verified_phone_token";
      }

      const payload = {
        ...form,
        humanVerificationToken: humanToken,
        firebaseIdToken: activeToken,
        fees: form.role === "doctor" ? Number(form.fees) || 0 : 0,
        age: form.role === "patient" && form.age ? Number(form.age) : undefined
      };

      const { data } = await api.post("/auth/register", payload);
      if (form.role === "doctor") {
        setSuccess(data.message || "Application submitted for Admin review!");
        setTimeout(() => navigate("/login"), 3500);
      } else {
        navigate("/login");
      }
      if (firebaseConfigured && firebaseApp && getAuth(firebaseApp).currentUser) {
        await signOut(getAuth(firebaseApp));
      }
    } catch (err) {
      if (!err.response) {
        setError("Cannot connect to backend server. Make sure backend is running.");
      } else {
        setError(err.response?.data?.message || "Registration failed.");
      }
    }
  }

  return (
    <main className="auth-page fade-in">
      <div className="auth-container" style={{ gridTemplateColumns: "1fr", maxWidth: "520px" }}>
        {/* Active Form Container */}
        <form className="auth-card" onSubmit={submit}>
          <h1>Create an account</h1>
          <p className="muted" style={{ fontSize: "14px", color: "#64748b", marginBottom: "8px" }}>
            Select registration type to get started.
          </p>

          <div className="role-tabs">
            <button
              type="button"
              className={`role-tab-btn ${form.role === "patient" ? "active" : ""}`}
              onClick={() => { setForm({ ...form, role: "patient" }); resetPhoneVerification(); }}
            >
              <User size={15} />
              <span>Patient Account</span>
            </button>
            <button
              type="button"
              className={`role-tab-btn ${form.role === "doctor" ? "active" : ""}`}
              onClick={() => { setForm({ ...form, role: "doctor" }); resetPhoneVerification(); }}
            >
              <Stethoscope size={15} />
              <span>Doctor Application</span>
            </button>
          </div>

          {error && <div className="error">{error}</div>}
          {success && <div className="success">{success}</div>}

          {form.role === "doctor" && (
            <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", padding: "12px 14px", borderRadius: "12px", fontSize: "13px", color: "#1e40af", marginBottom: "16px", display: "flex", gap: "10px", alignItems: "center" }}>
              <ShieldAlert size={20} color="#2563eb" />
              <div>
                <strong>Admin Review Required:</strong> Doctor applications are reviewed by system administrators prior to account approval.
              </div>
            </div>
          )}

          <div className="form-group">
            <label>Full Name</label>
            <input placeholder="Dr. John Doe / Jane Smith" required value={form.name}
              onChange={e => setForm({...form, name: e.target.value})} />
          </div>

          <div className="form-group">
            <label>Email Address</label>
            <input placeholder="email@example.com" type="email" required value={form.email}
              onChange={e => setForm({...form, email: e.target.value})} />
          </div>

          <div className="form-group">
            <label>Password</label>
            <input placeholder="Password (8+ characters)" type="password" required value={form.password}
              onChange={e => setForm({...form, password: e.target.value})} />
          </div>

          {/* Human Verification CAPTCHA Widget */}
          <HumanVerification
            onVerify={(isOk, token) => {
              setHumanVerified(isOk);
              setHumanToken(token);
            }}
          />

          <div className="form-group">
            <label>Phone Number (International Format)</label>
            <div style={{ display: "flex", gap: "8px" }}>
              <input placeholder="+919876543210" required value={form.phone}
                onChange={e => updatePhone(e.target.value)} />
              <button type="button" className="primary" onClick={sendOtp} disabled={sendingOtp || phoneVerified || !humanVerified} style={{ whiteSpace: "nowrap" }}>
                {phoneVerified ? "Verified ✓" : sendingOtp ? "Sending..." : otpSent ? "Resend OTP" : "Send OTP"}
              </button>
            </div>
          </div>

          <div id="recaptcha-container" style={{ margin: "4px 0" }} />
          {otpSent && !phoneVerified && (
            <div className="form-group" style={{ background: "#f0f9ff", padding: "12px", borderRadius: "10px", border: "1px solid #bae6fd" }}>
              <label style={{ fontSize: "12px", color: "#0369a1" }}>Enter 6-digit OTP Code</label>
              <div style={{ display: "flex", gap: "8px" }}>
                <input placeholder="Enter OTP (Demo: 123456)" inputMode="numeric" value={otp}
                  onChange={e => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))} />
                <button type="button" className="primary" onClick={verifyOtp} disabled={verifyingOtp || otp.length < 6} style={{ whiteSpace: "nowrap" }}>
                  {verifyingOtp ? "Verifying..." : "Verify OTP"}
                </button>
              </div>
            </div>
          )}

          {form.role === "patient" && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", margin: "4px 0 12px" }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Age</label>
                <input placeholder="Age" type="number" min="1" value={form.age}
                  onChange={e => setForm({...form, age: e.target.value})} />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Gender</label>
                <select value={form.gender} onChange={e => setForm({...form, gender: e.target.value})}>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>
          )}

          {form.role === "doctor" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px", margin: "4px 0 12px" }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Specialization</label>
                <input placeholder="e.g. Cardiologist, General Physician" required value={form.specialization}
                  onChange={e => setForm({...form, specialization: e.target.value})} />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Qualification & Degree</label>
                <input placeholder="e.g. MBBS, MD, MS" required value={form.qualification}
                  onChange={e => setForm({...form, qualification: e.target.value})} />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Medical Council Registration No.</label>
                <input placeholder="e.g. MCI-987654" required value={form.medicalRegNo}
                  onChange={e => setForm({...form, medicalRegNo: e.target.value})} />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Experience</label>
                  <input placeholder="e.g. 8 years" required value={form.experience}
                    onChange={e => setForm({...form, experience: e.target.value})} />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Consultation Fee (₹)</label>
                  <input placeholder="e.g. 500" type="number" min="0" required value={form.fees}
                    onChange={e => setForm({...form, fees: e.target.value})} />
                </div>
              </div>
            </div>
          )}

          <button className="primary" style={{ width: "100%", marginTop: "16px", padding: "14px" }} disabled={!phoneVerified || !humanVerified}>
            <span>{form.role === "patient" ? "Register as Patient" : "Submit Doctor Application"}</span>
            <ArrowRight size={17} />
          </button>
          
          <p style={{ marginTop: "20px", textAlign: "center", fontSize: "14px", color: "#64748b" }}>
            Already registered?{" "}
            <Link to="/login" style={{ color: "#0284c7", fontWeight: "700", textDecoration: "none" }}>
              Sign in
            </Link>
          </p>
        </form>
      </div>
    </main>
  );
}
