import { useState } from "react";
import { CreditCard, Smartphone, Building2, DollarSign, CheckCircle2, X, ShieldCheck, Lock } from "lucide-react";
import api from "../api";

export default function PaymentModal({ appointment, onClose, onPaymentSuccess }) {
  const [method, setMethod] = useState("upi");
  const [upiId, setUpiId] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCardCvv] = useState("");
  const [cardName, setCardName] = useState("");
  const [bank, setBank] = useState("HDFC Bank");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successData, setSuccessData] = useState(null);

  const fee = appointment?.fee ?? appointment?.doctor?.fees ?? 0;

  async function handlePayment(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await new Promise(resolve => setTimeout(resolve, 800));

      const res = await api.post(`/appointments/${appointment._id}/pay`, {
        paymentMethod: method
      });

      setSuccessData(res.data?.appointment || res.data);
      if (onPaymentSuccess) {
        onPaymentSuccess(res.data?.appointment || appointment);
      }

      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.message || "Payment processing failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget && !loading) onClose(); }}>
      <div className="modal-content fade-in" style={{ maxWidth: "500px" }}>
        <div className="modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div className="logo-badge" style={{ width: "36px", height: "36px" }}>
              <CreditCard size={20} color="#ffffff" />
            </div>
            <h3 style={{ margin: 0, fontSize: "18px" }}>Healthcare Checkout</h3>
          </div>
          <button type="button" className="close-btn" disabled={loading} onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {successData ? (
          <div style={{ textAlign: "center", padding: "30px 10px" }}>
            <div style={{ width: "64px", height: "64px", borderRadius: "50%", background: "#dcfce7", color: "#16a34a", display: "grid", placeItems: "center", margin: "0 auto 16px" }}>
              <CheckCircle2 size={36} />
            </div>
            <h3 style={{ fontSize: "22px", color: "#0f172a", marginBottom: "6px" }}>Payment Successful!</h3>
            <p style={{ fontSize: "28px", fontWeight: "800", color: "#059669", margin: "8px 0" }}>₹{fee}</p>
            <p style={{ fontSize: "13px", color: "#64748b" }}>Transaction ID: <strong>{successData.paymentId || "PAY-SUCCESS"}</strong></p>
            <p style={{ fontSize: "13px", color: "#64748b" }}>Method: {method.toUpperCase()}</p>
          </div>
        ) : (
          <form onSubmit={handlePayment}>
            {/* Consultation Summary Receipt */}
            <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "14px", padding: "16px", marginBottom: "20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <span style={{ fontSize: "13px", color: "#64748b", fontWeight: "600" }}>Doctor</span>
                <strong style={{ fontSize: "14px", color: "#0f172a" }}>{appointment.doctor?.name || "Specialist Doctor"}</strong>
              </div>
              {appointment.doctor?.specialization && (
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                  <span style={{ fontSize: "12px", color: "#64748b" }}>Specialty</span>
                  <span className="badge-pill-header">{appointment.doctor.specialization}</span>
                </div>
              )}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "10px", borderTop: "1px dashed #cbd5e1" }}>
                <span style={{ fontWeight: "700", color: "#0f172a", fontSize: "14px" }}>Total Amount</span>
                <span style={{ fontSize: "22px", fontWeight: "800", color: "#0284c7" }}>₹{fee}</span>
              </div>
            </div>

            {error && <div className="error">{error}</div>}

            <label style={{ fontSize: "13px", fontWeight: "700", color: "#334155", marginBottom: "8px", display: "block" }}>
              Select Payment Method
            </label>
            
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "20px" }}>
              <button
                type="button"
                className={`secondary-btn ${method === "upi" ? "primary" : ""}`}
                onClick={() => setMethod("upi")}
                style={{ padding: "12px", justifyContent: "flex-start" }}
              >
                <Smartphone size={16} />
                <span>UPI / QR</span>
              </button>
              <button
                type="button"
                className={`secondary-btn ${method === "card" ? "primary" : ""}`}
                onClick={() => setMethod("card")}
                style={{ padding: "12px", justifyContent: "flex-start" }}
              >
                <CreditCard size={16} />
                <span>Card</span>
              </button>
              <button
                type="button"
                className={`secondary-btn ${method === "netbanking" ? "primary" : ""}`}
                onClick={() => setMethod("netbanking")}
                style={{ padding: "12px", justifyContent: "flex-start" }}
              >
                <Building2 size={16} />
                <span>NetBanking</span>
              </button>
              <button
                type="button"
                className={`secondary-btn ${method === "cash" ? "primary" : ""}`}
                onClick={() => setMethod("cash")}
                style={{ padding: "12px", justifyContent: "flex-start" }}
              >
                <DollarSign size={16} />
                <span>Pay at Clinic</span>
              </button>
            </div>

            <div style={{ marginBottom: "20px" }}>
              {method === "upi" && (
                <div className="form-group">
                  <label>UPI ID / VPA</label>
                  <input
                    type="text"
                    required
                    placeholder="mobile@upi or name@okaxis"
                    value={upiId}
                    onChange={e => setUpiId(e.target.value)}
                  />
                  <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
                    {["patient@gpay", "patient@ybl", "patient@paytm"].map(app => (
                      <span
                        key={app}
                        onClick={() => setUpiId(app)}
                        style={{ fontSize: "11px", fontWeight: "600", color: "#0284c7", background: "#e0f2fe", padding: "4px 8px", borderRadius: "6px", cursor: "pointer" }}
                      >
                        {app}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {method === "card" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>Cardholder Name</label>
                    <input
                      type="text"
                      required
                      placeholder="Name as on card"
                      value={cardName}
                      onChange={e => setCardName(e.target.value)}
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>Card Number</label>
                    <input
                      type="text"
                      required
                      maxLength="19"
                      placeholder="4532 •••• •••• 8892"
                      value={cardNumber}
                      onChange={e => setCardNumber(e.target.value)}
                    />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 100px", gap: "10px" }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label>Expiry</label>
                      <input
                        type="text"
                        required
                        placeholder="MM/YY"
                        maxLength="5"
                        value={cardExpiry}
                        onChange={e => setCardExpiry(e.target.value)}
                      />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label>CVV</label>
                      <input
                        type="password"
                        required
                        maxLength="4"
                        placeholder="•••"
                        value={cardCvv}
                        onChange={e => setCardCvv(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              )}

              {method === "netbanking" && (
                <div className="form-group">
                  <label>Select Bank</label>
                  <select value={bank} onChange={e => setBank(e.target.value)}>
                    <option value="HDFC Bank">HDFC Bank</option>
                    <option value="State Bank of India">State Bank of India</option>
                    <option value="ICICI Bank">ICICI Bank</option>
                    <option value="Axis Bank">Axis Bank</option>
                    <option value="Kotak Mahindra Bank">Kotak Bank</option>
                  </select>
                </div>
              )}

              {method === "cash" && (
                <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", padding: "14px", borderRadius: "12px" }}>
                  <strong style={{ color: "#15803d", fontSize: "14px" }}>Pay at Desk / Clinic</strong>
                  <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#166534" }}>
                    You can pay consultation fee of <strong>₹{fee}</strong> via cash or card directly when visiting the clinic.
                  </p>
                </div>
              )}
            </div>

            <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
              <button
                type="submit"
                className="primary"
                disabled={loading}
                style={{ flex: 1, padding: "14px" }}
              >
                <Lock size={16} />
                <span>{loading ? "Processing..." : method === "cash" ? "Confirm Booking" : `Pay ₹${fee} Securely`}</span>
              </button>
              <button
                type="button"
                className="secondary-btn"
                disabled={loading}
                onClick={onClose}
              >
                Cancel
              </button>
            </div>
            
            <div style={{ display: "flex", alignItems: "center", justifyCenter: "center", gap: "6px", fontSize: "11px", color: "#94a3b8", marginTop: "14px", textAlign: "center" }}>
              <ShieldCheck size={14} color="#10b981" />
              <span>256-bit SSL Encrypted Healthcare Payment Protection</span>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
