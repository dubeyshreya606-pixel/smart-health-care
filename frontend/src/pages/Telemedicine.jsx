import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { io } from "socket.io-client";
import { Mic, MicOff, Video, VideoOff, PhoneOff, MessageSquare, Activity, FileText, Send, X, CheckCircle2 } from "lucide-react";

const socketUrl = import.meta.env.VITE_SOCKET_URL || "http://localhost:5000";

// Helper function to create an animated virtual video stream if physical camera is locked by another window/tab
function createFallbackStream(userName, userRole) {
  const canvas = document.createElement("canvas");
  canvas.width = 640;
  canvas.height = 480;
  const ctx = canvas.getContext("2d");

  let frame = 0;
  const interval = setInterval(() => {
    frame++;
    ctx.fillStyle = "#090e17";
    ctx.fillRect(0, 0, 640, 480);

    // Pulse animation
    const radius = 70 + Math.sin(frame * 0.08) * 8;
    ctx.beginPath();
    ctx.arc(320, 200, radius, 0, Math.PI * 2);
    ctx.fillStyle = userRole === "doctor" ? "rgba(2, 132, 199, 0.25)" : "rgba(16, 185, 129, 0.25)";
    ctx.fill();

    ctx.beginPath();
    ctx.arc(320, 200, 52, 0, Math.PI * 2);
    ctx.fillStyle = userRole === "doctor" ? "#0284c7" : "#10b981";
    ctx.fill();

    // Initial avatar letter
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 36px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText((userName || "User").charAt(0).toUpperCase(), 320, 200);

    // Participant details
    ctx.font = "bold 20px system-ui, sans-serif";
    ctx.fillText(userName || "Consultation Participant", 320, 300);

    ctx.font = "600 13px system-ui, sans-serif";
    ctx.fillStyle = userRole === "doctor" ? "#38bdf8" : "#34d399";
    ctx.fillText(`● LIVE HD CONSULTATION • ${userRole === "doctor" ? "Medical Specialist" : "Patient"}`, 320, 330);
  }, 40);

  const stream = canvas.captureStream(30);
  
  // Create silent audio track
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const dst = audioCtx.createMediaStreamDestination();
    osc.connect(dst);
    osc.start();
    const audioTrack = dst.stream.getAudioTracks()[0];
    if (audioTrack) stream.addTrack(audioTrack);
  } catch (err) {
    console.warn("Could not create audio oscillator:", err);
  }

  stream._cleanup = () => clearInterval(interval);
  return stream;
}

export default function Telemedicine() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const currentUser = JSON.parse(localStorage.getItem("user") || "{}");

  const localVideo = useRef(null);
  const remoteVideo = useRef(null);
  const pc = useRef(null);
  const localStream = useRef(null);
  const socket = useRef(null);
  const iceCandidateQueue = useRef([]);
  const timerRef = useRef(null);

  const [status, setStatus] = useState("Initializing consultation room...");
  const [isConnected, setIsConnected] = useState(false);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [remoteUser, setRemoteUser] = useState(null);
  const [remoteMediaState, setRemoteMediaState] = useState({ audioMuted: false, videoOff: false });
  const [remoteStreamAvailable, setRemoteStreamAvailable] = useState(false);
  
  // Call timer
  const [callSeconds, setCallSeconds] = useState(0);
  
  // In-call Chat state
  const [showChat, setShowChat] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [unreadChatCount, setUnreadChatCount] = useState(0);

  const formatTimer = (totalSeconds) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  async function processCandidateQueue() {
    if (!pc.current || !pc.current.remoteDescription) return;
    while (iceCandidateQueue.current.length > 0) {
      const cand = iceCandidateQueue.current.shift();
      try {
        await pc.current.addIceCandidate(new RTCIceCandidate(cand));
      } catch (err) {
        console.warn("Queued ICE candidate error:", err);
      }
    }
  }

  useEffect(() => {
    let active = true;

    async function setupCall() {
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: true
        });
      } catch (err) {
        console.warn("Hardware camera unavailable or in use by another tab. Using fallback stream:", err);
        stream = createFallbackStream(currentUser.name || "User", currentUser.role || "patient");
      }

      if (!active) {
        if (stream._cleanup) stream._cleanup();
        stream.getTracks().forEach(t => t.stop());
        return;
      }

      localStream.current = stream;
      if (localVideo.current) {
        localVideo.current.srcObject = stream;
      }

      const peerConnection = new RTCPeerConnection({
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" },
          { urls: "stun:stun1.l.google.com:19302" },
          { urls: "stun:stun2.l.google.com:19302" }
        ]
      });
      pc.current = peerConnection;

      stream.getTracks().forEach(track => {
        peerConnection.addTrack(track, stream);
      });

      peerConnection.ontrack = (event) => {
        if (event.streams && event.streams[0]) {
          if (remoteVideo.current) {
            remoteVideo.current.srcObject = event.streams[0];
            remoteVideo.current.play().catch(e => console.warn("Remote video play error:", e));
          }
          setRemoteStreamAvailable(true);
        }
      };

      peerConnection.onconnectionstatechange = () => {
        if (peerConnection.connectionState === "connected") {
          setIsConnected(true);
          setStatus("Encrypted HD Consultation Connected");
          if (!timerRef.current) {
            timerRef.current = setInterval(() => {
              setCallSeconds(prev => prev + 1);
            }, 1000);
          }
        } else if (peerConnection.connectionState === "disconnected" || peerConnection.connectionState === "failed") {
          setIsConnected(false);
          setStatus("Connection lost. Reconnecting...");
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
        }
      };

      peerConnection.onicecandidate = (event) => {
        if (event.candidate && socket.current) {
          socket.current.emit("signal", {
            roomId,
            signalData: { type: "candidate", candidate: event.candidate }
          });
          socket.current.emit("ice-candidate", {
            roomId,
            candidate: event.candidate
          });
        }
      };

      socket.current = io(socketUrl);

      socket.current.emit("join-room", {
        roomId,
        user: currentUser,
        userRole: currentUser.role || "patient",
        userName: currentUser.name || "User"
      });

      const initiateCall = async () => {
        if (!pc.current) return;
        try {
          const offer = await pc.current.createOffer();
          await pc.current.setLocalDescription(offer);
          socket.current.emit("signal", {
            roomId,
            signalData: { type: "offer", offer }
          });
          socket.current.emit("offer", { roomId, offer });
        } catch (err) {
          console.error("Error creating offer:", err);
        }
      };

      const handleOffer = async (offer, sender) => {
        if (!pc.current) return;
        if (sender) setRemoteUser(sender);
        try {
          await pc.current.setRemoteDescription(new RTCSessionDescription(offer));
          await processCandidateQueue();
          const answer = await pc.current.createAnswer();
          await pc.current.setLocalDescription(answer);
          socket.current.emit("signal", {
            roomId,
            signalData: { type: "answer", answer }
          });
          socket.current.emit("answer", { roomId, answer });
        } catch (err) {
          console.error("Error handling offer:", err);
        }
      };

      const handleAnswer = async (answer) => {
        if (!pc.current) return;
        try {
          await pc.current.setRemoteDescription(new RTCSessionDescription(answer));
          await processCandidateQueue();
        } catch (err) {
          console.error("Error handling answer:", err);
        }
      };

      const handleCandidate = async (candidate) => {
        if (!pc.current) return;
        if (pc.current.remoteDescription) {
          try {
            await pc.current.addIceCandidate(new RTCIceCandidate(candidate));
          } catch (err) {
            console.warn("Error adding ICE candidate:", err);
          }
        } else {
          iceCandidateQueue.current.push(candidate);
        }
      };

      socket.current.on("initiate-call", () => {
        setStatus("Initiating consultation call...");
        initiateCall();
      });

      socket.current.on("user-connected", (userData) => {
        setRemoteUser(userData);
        setStatus(`${userData.name || userData.userName || "Remote participant"} joined consultation`);
        initiateCall();
      });

      socket.current.on("signal", async ({ signalData, sender }) => {
        if (signalData.type === "offer") {
          await handleOffer(signalData.offer, sender);
        } else if (signalData.type === "answer") {
          await handleAnswer(signalData.answer);
        } else if (signalData.type === "candidate") {
          await handleCandidate(signalData.candidate);
        }
      });

      socket.current.on("offer", async ({ offer, sender }) => {
        await handleOffer(offer, sender);
      });

      socket.current.on("answer", async ({ answer }) => {
        await handleAnswer(answer);
      });

      socket.current.on("ice-candidate", async ({ candidate }) => {
        await handleCandidate(candidate);
      });

      socket.current.on("chat-message", (msg) => {
        setChatMessages(prev => [...prev, msg]);
        if (!showChat) {
          setUnreadChatCount(prev => prev + 1);
        }
      });

      socket.current.on("receive-chat", (msg) => {
        setChatMessages(prev => [...prev, msg]);
        if (!showChat) {
          setUnreadChatCount(prev => prev + 1);
        }
      });

      socket.current.on("media-state-changed", (mediaState) => {
        setRemoteMediaState(mediaState);
      });

      socket.current.on("peer-media-state", (mediaState) => {
        setRemoteMediaState(mediaState);
      });

      socket.current.on("user-disconnected", () => {
        setStatus("Remote participant disconnected");
        setIsConnected(false);
        setRemoteStreamAvailable(false);
        setRemoteUser(null);
      });

      socket.current.on("peer-left", () => {
        setStatus("Remote participant disconnected");
        setIsConnected(false);
        setRemoteStreamAvailable(false);
        setRemoteUser(null);
      });
    }

    setupCall();

    return () => {
      active = false;
      if (timerRef.current) clearInterval(timerRef.current);
      if (localStream.current) {
        if (localStream.current._cleanup) localStream.current._cleanup();
        localStream.current.getTracks().forEach(t => t.stop());
      }
      if (pc.current) pc.current.close();
      if (socket.current) socket.current.disconnect();
    };
  }, [roomId]);

  function toggleMic() {
    if (localStream.current) {
      const audioTrack = localStream.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMicMuted(!audioTrack.enabled);
        if (socket.current) {
          socket.current.emit("media-state-changed", {
            roomId,
            audioMuted: !audioTrack.enabled,
            videoOff: isVideoOff
          });
        }
      }
    }
  }

  function toggleVideo() {
    if (localStream.current) {
      const videoTrack = localStream.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOff(!videoTrack.enabled);
        if (socket.current) {
          socket.current.emit("media-state-changed", {
            roomId,
            audioMuted: isMicMuted,
            videoOff: !videoTrack.enabled
          });
        }
      }
    }
  }

  function sendChatMessage(e) {
    e.preventDefault();
    if (!chatInput.trim()) return;
    const msg = {
      sender: currentUser.name || "Me",
      text: chatInput.trim(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setChatMessages(prev => [...prev, msg]);
    if (socket.current) {
      socket.current.emit("chat-message", { roomId, msg });
    }
    setChatInput("");
  }

  return (
    <main className="video-page-enhanced">
      {/* Header */}
      <header className="video-header-enhanced">
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div className="logo-badge" style={{ width: "36px", height: "36px" }}>
            <Activity size={20} color="#ffffff" />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "800", color: "#f8fafc" }}>Telemedicine Consultation Room</h3>
            <span style={{ fontSize: "12px", color: "#38bdf8", fontWeight: "600" }}>Room ID: {roomId}</span>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{ background: "rgba(255,255,255,0.08)", padding: "6px 14px", borderRadius: "20px", fontSize: "13px", color: "#94a3b8", display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: isConnected ? "#10b981" : "#f59e0b" }}></span>
            <span>{status}</span>
          </div>
          {isConnected && (
            <div style={{ background: "rgba(16, 185, 129, 0.15)", color: "#34d399", border: "1px solid rgba(52, 211, 153, 0.3)", padding: "6px 14px", borderRadius: "20px", fontSize: "13px", fontWeight: "700" }}>
              ⏱ {formatTimer(callSeconds)}
            </div>
          )}
        </div>
      </header>

      {/* Main Video View & Side Panel */}
      <div className="video-main-content">
        <div className="video-grid-container">
          {/* Local Video Tile */}
          <div className="video-tile">
            <video ref={localVideo} autoPlay playsInline muted className="video-element" />
            <div className="video-label-badge">
              <span className="live-dot"></span>
              <span>{currentUser.name || "You"} ({currentUser.role === "doctor" ? "Doctor" : "Patient"})</span>
              {isMicMuted && <MicOff size={14} color="#f43f5e" />}
            </div>
          </div>

          {/* Remote Video Tile */}
          <div className="video-tile">
            <video
              ref={remoteVideo}
              autoPlay
              playsInline
              className="video-element"
              style={{ display: "block" }}
            />
            {!remoteStreamAvailable && (
              <div className="waiting-overlay">
                <Activity size={36} color="#0284c7" style={{ marginBottom: "10px" }} />
                <p style={{ fontWeight: "700", color: "#f1f5f9", margin: "4px 0" }}>Waiting for participant...</p>
                <p style={{ fontSize: "12px", color: "#94a3b8" }}>Share Room ID: <strong style={{ color: "#38bdf8" }}>{roomId}</strong> with doctor/patient to connect</p>
              </div>
            )}
            <div className="video-label-badge">
              <span className="live-dot" style={{ background: remoteStreamAvailable ? "#10b981" : "#f59e0b" }}></span>
              <span>{remoteUser?.name || remoteUser?.userName || (currentUser.role === "doctor" ? "Patient" : "Doctor")}</span>
              {remoteMediaState.audioMuted && <MicOff size={14} color="#f43f5e" />}
            </div>
          </div>
        </div>

        {/* Chat Drawer Side Panel */}
        {showChat && (
          <aside className="chat-sidebar-enhanced">
            <div style={{ padding: "16px", borderBottom: "1px solid rgba(255,255,255,0.1)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: "700", color: "#f8fafc" }}>
                <MessageSquare size={18} color="#38bdf8" />
                <span>Consultation Chat</span>
              </div>
              <button onClick={() => setShowChat(false)} style={{ background: "transparent", border: "none", color: "#94a3b8", cursor: "pointer" }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ flex: 1, padding: "16px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "10px" }}>
              {chatMessages.length === 0 ? (
                <div style={{ textAlign: "center", color: "#64748b", fontSize: "13px", marginTop: "40px" }}>
                  No messages yet. Send a note or clinical instruction.
                </div>
              ) : (
                chatMessages.map((m, i) => (
                  <div key={i} style={{ background: m.sender === (currentUser.name || "Me") ? "rgba(2, 132, 199, 0.2)" : "rgba(255, 255, 255, 0.06)", padding: "10px 14px", borderRadius: "12px", border: "1px solid rgba(255, 255, 255, 0.08)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "#94a3b8", marginBottom: "4px" }}>
                      <strong style={{ color: "#38bdf8" }}>{m.sender}</strong>
                      <span>{m.time}</span>
                    </div>
                    <p style={{ margin: 0, fontSize: "13px", color: "#f1f5f9" }}>{m.text}</p>
                  </div>
                ))
              )}
            </div>

            <form onSubmit={sendChatMessage} style={{ padding: "14px", borderTop: "1px solid rgba(255,255,255,0.1)", display: "flex", gap: "8px" }}>
              <input
                type="text"
                placeholder="Type message..."
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                style={{ background: "#1e293b", border: "1px solid rgba(255,255,255,0.15)", color: "white", borderRadius: "10px" }}
              />
              <button type="submit" className="primary" style={{ borderRadius: "10px", padding: "0 16px" }}>
                <Send size={16} />
              </button>
            </form>
          </aside>
        )}
      </div>

      {/* Floating Media Controls Toolbar */}
      <footer className="controls-bar-enhanced">
        <button
          type="button"
          className={`ctrl-btn ${isMicMuted ? "active-off" : ""}`}
          onClick={toggleMic}
          title={isMicMuted ? "Unmute Mic" : "Mute Mic"}
        >
          {isMicMuted ? <MicOff size={20} /> : <Mic size={20} />}
        </button>

        <button
          type="button"
          className={`ctrl-btn ${isVideoOff ? "active-off" : ""}`}
          onClick={toggleVideo}
          title={isVideoOff ? "Start Camera" : "Stop Camera"}
        >
          {isVideoOff ? <VideoOff size={20} /> : <Video size={20} />}
        </button>

        <button
          type="button"
          className="ctrl-btn"
          onClick={() => { setShowChat(!showChat); setUnreadChatCount(0); }}
          title="Consultation Chat"
          style={{ position: "relative" }}
        >
          <MessageSquare size={20} />
          {unreadChatCount > 0 && (
            <span style={{ position: "absolute", top: "-2px", right: "-2px", background: "#e11d48", color: "white", borderRadius: "50%", width: "18px", height: "18px", fontSize: "10px", display: "grid", placeItems: "center", fontWeight: "bold" }}>
              {unreadChatCount}
            </span>
          )}
        </button>

        {currentUser.role === "doctor" && (
          <Link to={`/appointment/${roomId}`} target="_blank" className="ctrl-btn" title="Write & Issue Digital Prescription">
            <FileText size={20} />
          </Link>
        )}

        <button
          type="button"
          className="ctrl-btn leave-btn"
          onClick={() => navigate("/")}
          title="End Consultation Call"
        >
          <PhoneOff size={18} />
          <span>End Call</span>
        </button>
      </footer>
    </main>
  );
}
