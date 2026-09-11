import { useState, useEffect, useRef } from "react";
import { ShieldCheck, RefreshCw, CheckCircle2, Lock } from "lucide-react";

export default function HumanVerification({ onVerify, resetTrigger }) {
  const [captchaText, setCaptchaText] = useState("");
  const [userInput, setUserInput] = useState("");
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState("");
  const canvasRef = useRef(null);

  const generateCaptcha = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let text = "";
    for (let i = 0; i < 6; i++) {
      text += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setCaptchaText(text);
    setUserInput("");
    setVerified(false);
    setError("");
    if (onVerify) onVerify(false, null);
  };

  useEffect(() => {
    generateCaptcha();
  }, [resetTrigger]);

  useEffect(() => {
    if (!captchaText || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    grad.addColorStop(0, "#0f172a");
    grad.addColorStop(1, "#1e293b");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let i = 0; i < 7; i++) {
      ctx.strokeStyle = `rgba(${100 + Math.random() * 155}, ${100 + Math.random() * 155}, 255, 0.4)`;
      ctx.lineWidth = 1 + Math.random() * 2;
      ctx.beginPath();
      ctx.moveTo(Math.random() * canvas.width, Math.random() * canvas.height);
      ctx.lineTo(Math.random() * canvas.width, Math.random() * canvas.height);
      ctx.stroke();
    }

    for (let i = 0; i < 40; i++) {
      ctx.fillStyle = `rgba(255, 255, 255, ${0.1 + Math.random() * 0.3})`;
      ctx.beginPath();
      ctx.arc(Math.random() * canvas.width, Math.random() * canvas.height, Math.random() * 2, 0, Math.PI * 2);
      ctx.fill();
    }

    const colors = ["#38bdf8", "#818cf8", "#a78bfa", "#f472b6", "#34d399", "#fbbf24"];
    ctx.font = "bold 22px system-ui, sans-serif";
    ctx.textBaseline = "middle";

    const charWidth = (canvas.width - 20) / captchaText.length;
    for (let i = 0; i < captchaText.length; i++) {
      const char = captchaText[i];
      const x = 12 + i * charWidth;
      const y = canvas.height / 2 + (Math.random() * 6 - 3);
      const angle = (Math.random() * 0.4 - 0.2);

      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);
      ctx.fillStyle = colors[i % colors.length];
      ctx.shadowColor = "rgba(0, 0, 0, 0.5)";
      ctx.shadowBlur = 4;
      ctx.fillText(char, 0, 0);
      ctx.restore();
    }
  }, [captchaText]);

  const handleCheck = (e) => {
    e.preventDefault();
    if (userInput.trim().toUpperCase() === captchaText) {
      setVerified(true);
      setError("");
      const token = `hv_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
      if (onVerify) onVerify(true, token);
    } else {
      setError("Incorrect code. Please try again.");
      setVerified(false);
      if (onVerify) onVerify(false, null);
    }
  };

  return (
    <div className={`human-verify-card ${verified ? "verified" : ""}`}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: "700", fontSize: "13px", color: verified ? "#15803d" : "#0f172a" }}>
          <ShieldCheck size={18} color={verified ? "#10b981" : "#0284c7"} />
          <span>Human Verification Security Check</span>
        </div>
        {verified && (
          <span className="badge completed" style={{ fontSize: "11px" }}>
            <CheckCircle2 size={12} /> Verified
          </span>
        )}
      </div>

      {!verified ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <canvas ref={canvasRef} width={190} height={46} style={{ borderRadius: "8px", border: "1px solid #cbd5e1" }} />
            <button
              type="button"
              className="secondary-btn"
              onClick={generateCaptcha}
              style={{ padding: "10px", borderRadius: "8px" }}
              title="Generate new challenge"
            >
              <RefreshCw size={16} />
            </button>
          </div>

          <div style={{ display: "flex", gap: "8px" }}>
            <input
              type="text"
              placeholder="Enter CAPTCHA Code"
              maxLength={6}
              value={userInput}
              style={{ letterSpacing: "2px", fontWeight: "700", textTransform: "uppercase" }}
              onChange={(e) => {
                setUserInput(e.target.value.toUpperCase());
                setError("");
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCheck(e);
              }}
            />
            <button
              type="button"
              className="primary"
              onClick={handleCheck}
              disabled={userInput.length < 4}
              style={{ padding: "0 18px" }}
            >
              Verify
            </button>
          </div>
          {error && <div className="error" style={{ margin: 0, padding: "8px 12px", fontSize: "12px" }}>{error}</div>}
        </div>
      ) : (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: "13px", color: "#15803d", fontWeight: "600", display: "flex", alignItems: "center", gap: "6px" }}>
            <CheckCircle2 size={16} /> Security challenge verified successfully
          </div>
          <button
            type="button"
            className="secondary-btn"
            onClick={generateCaptcha}
            style={{ fontSize: "11px", padding: "4px 10px" }}
          >
            Refresh
          </button>
        </div>
      )}
    </div>
  );
}
