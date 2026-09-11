import { Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Appointment from "./pages/Appointment";
import Telemedicine from "./pages/Telemedicine";
import AdminDashboard from "./pages/AdminDashboard";

function Protected({ children }) {
  return localStorage.getItem("token") ? children : <Navigate to="/login" replace />;
}

function AdminProtected({ children }) {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  return localStorage.getItem("token") && user.role === "admin" ? (
    children
  ) : (
    <Navigate to="/login" replace />
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/" element={<Protected><Dashboard /></Protected>} />
      <Route path="/admin" element={<AdminProtected><AdminDashboard /></AdminProtected>} />
      <Route path="/appointment/:id" element={<Protected><Appointment /></Protected>} />
      <Route path="/telemedicine/:roomId" element={<Protected><Telemedicine /></Protected>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

