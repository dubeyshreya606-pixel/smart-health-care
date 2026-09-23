export function setupSocket(io) {
  io.on("connection", (socket) => {
    socket.on("join-room", (payload) => {
      const { roomId } = payload || {};
      if (!roomId) return;

      const userRole = payload.userRole || payload.user?.role || "participant";
      const userName = payload.userName || payload.user?.name || "Participant";
      const userObj = payload.user || { name: userName, role: userRole };

      const room = io.sockets.adapter.rooms.get(roomId);
      const count = room ? room.size : 0;

      if (count >= 2) {
        socket.emit("room-full");
        return;
      }

      socket.join(roomId);
      socket.data.roomId = roomId;
      socket.data.userRole = userRole;
      socket.data.userName = userName;
      socket.data.user = userObj;

      const updatedRoom = io.sockets.adapter.rooms.get(roomId);
      const newCount = updatedRoom ? updatedRoom.size : 0;

      socket.emit("room-joined", { roomId, count: newCount });

      // Notify existing peer(s) about this new participant
      socket.to(roomId).emit("user-connected", {
        socketId: socket.id,
        userRole,
        userName,
        user: userObj,
        name: userName,
        role: userRole
      });

      // Instruct room to initiate call when 2 participants are ready
      if (newCount === 2) {
        socket.to(roomId).emit("initiate-call", { initiator: socket.id });
      }
    });

    socket.on("user-info", ({ roomId, userRole, userName }) => {
      socket.to(roomId).emit("peer-info", { userRole, userName });
    });

    // Flexible WebRTC Signaling Handler (Signal format)
    socket.on("signal", ({ roomId, signalData }) => {
      if (!roomId || !signalData) return;
      socket.to(roomId).emit("signal", {
        signalData,
        sender: socket.data.user || { name: socket.data.userName, role: socket.data.userRole },
        from: socket.id
      });
      // Also bridge to explicit offer/answer/ice-candidate events
      if (signalData.type === "offer") {
        socket.to(roomId).emit("offer", { offer: signalData.offer, from: socket.id });
      } else if (signalData.type === "answer") {
        socket.to(roomId).emit("answer", { answer: signalData.answer, from: socket.id });
      } else if (signalData.type === "candidate") {
        socket.to(roomId).emit("ice-candidate", { candidate: signalData.candidate, from: socket.id });
      }
    });

    // Explicit WebRTC Offer
    socket.on("offer", ({ roomId, offer }) => {
      if (!roomId) return;
      socket.to(roomId).emit("offer", { offer, from: socket.id });
      socket.to(roomId).emit("signal", {
        signalData: { type: "offer", offer },
        sender: socket.data.user || { name: socket.data.userName, role: socket.data.userRole },
        from: socket.id
      });
    });

    // Explicit WebRTC Answer
    socket.on("answer", ({ roomId, answer }) => {
      if (!roomId) return;
      socket.to(roomId).emit("answer", { answer, from: socket.id });
      socket.to(roomId).emit("signal", {
        signalData: { type: "answer", answer },
        sender: socket.data.user || { name: socket.data.userName, role: socket.data.userRole },
        from: socket.id
      });
    });

    // Explicit ICE Candidate
    socket.on("ice-candidate", ({ roomId, candidate }) => {
      if (!roomId) return;
      socket.to(roomId).emit("ice-candidate", { candidate, from: socket.id });
      socket.to(roomId).emit("signal", {
        signalData: { type: "candidate", candidate },
        sender: socket.data.user || { name: socket.data.userName, role: socket.data.userRole },
        from: socket.id
      });
    });

    // Media State Toggles
    socket.on("media-state-change", ({ roomId, audioMuted, videoOff }) => {
      if (!roomId) return;
      socket.to(roomId).emit("peer-media-state", { audioMuted, videoOff });
      socket.to(roomId).emit("media-state-changed", { audioMuted, videoOff });
    });

    socket.on("media-state-changed", ({ roomId, audioMuted, videoOff }) => {
      if (!roomId) return;
      socket.to(roomId).emit("peer-media-state", { audioMuted, videoOff });
      socket.to(roomId).emit("media-state-changed", { audioMuted, videoOff });
    });

    // In-Call Chat
    socket.on("send-chat", ({ roomId, message, senderName, senderRole, msg }) => {
      if (!roomId) return;
      const chatPayload = msg || {
        id: Date.now() + "-" + Math.random().toString(36).substring(2, 7),
        timestamp: Date.now(),
        text: message,
        sender: senderName || socket.data.userName || "Participant",
        senderRole: senderRole || socket.data.userRole || "user",
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      };
      socket.to(roomId).emit("chat-message", chatPayload);
    });

    socket.on("chat-message", ({ roomId, msg }) => {
      if (!roomId) return;
      const chatPayload = {
        id: msg?.id || (Date.now() + "-" + Math.random().toString(36).substring(2, 7)),
        timestamp: msg?.timestamp || Date.now(),
        ...msg
      };
      socket.to(roomId).emit("chat-message", chatPayload);
    });

    // Disconnection
    socket.on("disconnecting", () => {
      for (const roomId of socket.rooms) {
        if (roomId !== socket.id) {
          socket.to(roomId).emit("peer-left");
          socket.to(roomId).emit("user-disconnected");
        }
      }
    });
  });
}
