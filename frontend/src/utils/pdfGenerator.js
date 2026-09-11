import { jsPDF } from "jspdf";

export function generatePrescriptionPDF({
  doctorName = "Doctor",
  doctorSpecialization = "Medical Specialist",
  patientName = "Patient",
  patientEmail = "",
  diagnosis = "General Consultation",
  medicines = [],
  instructions = "",
  date = new Date(),
  fee = 0,
  paymentStatus = "completed",
  prescriptionId = ""
}) {
  const doc = new jsPDF();
  const primaryColor = [2, 132, 199]; // #0284c7

  // Header Banner Background
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, 210, 32, "F");

  // Header Title & Subtitle
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(255, 255, 255);
  doc.text("SMART HEALTHCARE MEDICAL CENTER", 14, 18);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text("Official Digital Prescription (Rx) & Clinical Consultation Note", 14, 25);

  // Info Section Box
  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, 38, 182, 38, 3, 3, "FD");

  // Left Column - Patient Details
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.setFont("helvetica", "bold");
  doc.text(`Patient Name: ${patientName}`, 20, 48);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text(`Email: ${patientEmail || "N/A"}`, 20, 55);
  doc.text(`Date Issued: ${new Date(date).toLocaleDateString()} ${new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`, 20, 62);
  if (prescriptionId) {
    doc.text(`Rx Ref ID: ${prescriptionId}`, 20, 69);
  }

  // Right Column - Doctor Details
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.setFont("helvetica", "bold");
  doc.text(`Doctor: ${doctorName}`, 110, 48);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text(`Specialty: ${doctorSpecialization}`, 110, 55);
  doc.text(`Consultation Fee: Rs. ${fee}`, 110, 62);
  doc.text(`Payment: ${paymentStatus.toUpperCase()}`, 110, 69);

  // Diagnosis Header & Content
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...primaryColor);
  doc.text("CLINICAL DIAGNOSIS", 14, 88);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text(diagnosis || "General Health Consultation", 14, 96);

  // Prescribed Medications Table
  let y = 108;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...primaryColor);
  doc.text("PRESCRIBED MEDICATIONS (Rx)", 14, y);
  y += 6;

  // Table Header Line Box
  doc.setFillColor(224, 242, 254);
  doc.rect(14, y, 182, 8, "F");

  doc.setFontSize(9);
  doc.setTextColor(3, 105, 161);
  doc.setFont("helvetica", "bold");
  doc.text("#", 18, y + 6);
  doc.text("MEDICINE NAME", 28, y + 6);
  doc.text("DOSAGE", 100, y + 6);
  doc.text("FREQUENCY", 135, y + 6);
  doc.text("DURATION", 168, y + 6);
  y += 12;

  // Table Content Rows
  doc.setFontSize(9);
  medicines?.forEach((m, idx) => {
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 116, 139);
    doc.text(`${idx + 1}`, 18, y);

    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    doc.text(m.name || "-", 28, y);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(51, 65, 85);
    doc.text(m.dosage || "-", 100, y);
    doc.text(m.frequency || "-", 135, y);
    doc.text(m.duration || "-", 168, y);

    doc.setDrawColor(241, 245, 249);
    doc.line(14, y + 3, 196, y + 3);
    y += 9;
  });

  // Instructions & Advice Section
  y += 6;
  if (instructions) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(...primaryColor);
    doc.text("SPECIAL INSTRUCTIONS & ADVICE", 14, y);
    y += 6;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(51, 65, 85);
    const splitText = doc.splitTextToSize(instructions, 180);
    doc.text(splitText, 14, y);
    y += (splitText.length * 5) + 12;
  }

  // Doctor Signature Line
  y = Math.max(y + 10, 240);
  doc.setDrawColor(203, 213, 225);
  doc.line(135, y, 195, y);

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text("Doctor Signature / Stamp", 135, y + 6);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 116, 139);
  doc.text(`${doctorName}`, 135, y + 11);

  // Footer Branding & Disclaimer
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text("This is an authenticated computer-generated digital prescription note. Valid for pharmacy dispensing.", 14, 285);

  // Save Document
  const fileName = `Prescription_Note_${patientName.replace(/[^a-zA-Z0-9]/g, "_")}_${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(fileName);
}
