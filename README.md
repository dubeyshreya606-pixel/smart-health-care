# Smart Healthcare Telemedicine & Prescription Management

A full-stack educational MVP inspired by the application in the provided image.

## Features
- Patient and doctor registration/login
- JWT authentication + role-based access
- Doctor dashboard
- Patient dashboard
- Appointment scheduling
- Patient medical-history timeline
- Secure-style telemedicine room using WebRTC + Socket.IO signaling
- Doctor prescription creation
- AES-256-GCM encryption for prescription text at rest
- Prescription PDF generation with jsPDF
- MongoDB database
- Helmet, CORS, rate limiting and password hashing

> IMPORTANT: This is an academic/demo project. It is NOT automatically HIPAA compliant.
> Real healthcare deployment requires legal/compliance review, secure infrastructure,
> audit logging, access policies, BAAs where applicable, encryption/key management,
> backups, incident response, and professional security testing.

## Requirements
- Node.js 20+
- MongoDB 7+ locally OR a MongoDB Atlas connection string
- VS Code
- Two browser windows/tabs for testing WebRTC

## 1. Start MongoDB
Local MongoDB:
    mongod

Or create a MongoDB Atlas database and put its connection string in backend/.env.

## 2. Backend
    cd backend
    npm install
    copy .env.example .env
    npm run dev

Backend runs on:
    http://localhost:5000

Socket.IO is served by the same backend.

## 3. Frontend
Open another terminal:
    cd frontend
    npm install
    copy .env.example .env
    npm run dev

Frontend:
    http://localhost:5173

## 4. Phone OTP registration
Phone OTP verification is required before a patient or doctor account is created.

1. In Firebase Console, enable **Authentication > Sign-in method > Phone**.
2. Copy the web app configuration into `frontend/.env` using `frontend/.env.example`.
3. In Firebase Console, create a service account key under **Project settings > Service accounts**.
4. Put its `project_id`, `client_email`, and `private_key` into `backend/.env` as
   `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, and `FIREBASE_PRIVATE_KEY`.
5. Enter phone numbers in international format, such as `+919876543210`.

The frontend sends and verifies the SMS code with Firebase. The backend verifies
the resulting Firebase ID token and only then creates the account.

## 5. Demo accounts
Register two accounts:
- one with role `doctor`
- one with role `patient`

Create an appointment as the patient. The doctor can then view appointments and
create prescriptions.

## 6. Telemedicine test
1. Login as patient in Chrome.
2. Open an appointment and join its room.
3. Login as doctor in another browser/incognito window.
4. Open the same appointment and join.
5. Allow camera/microphone.
6. The two peers should connect.

For production deployment, WebRTC normally needs a TURN server in addition to STUN,
because direct peer-to-peer connectivity is not guaranteed on every network.

## Project structure

smart-healthcare-app/
├── backend/
│   ├── src/
│   │   ├── config/db.js
│   │   ├── middleware/auth.js
│   │   ├── middleware/error.js
│   │   ├── models/
│   │   ├── routes/
│   │   ├── services/encryption.js
│   │   ├── socket.js
│   │   └── server.js
│   ├── .env.example
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── api.js
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   ├── styles.css
│   │   ├── components/
│   │   └── pages/
│   ├── .env.example
│   └── package.json
└── README.md
