# 🤖 Agent Guide — Kasi Market

This guide is for AI agents working on the **Kasi Market** project. It provides an architectural overview and explains the key patterns and design decisions.

## 🏗️ Architecture

### Frontend (React/Vite)
- **State Management:** React `useState` and `useEffect` are primarily used for local state. `AuthContext` handles global authentication state.
- **Styling:** A custom, comprehensive design system in `client/src/index.css` using CSS Custom Properties. The theme is a **Premium Dark Theme** with high contrast and accessibility.
- **Icons:** [Lucide React](https://lucide.dev/icons) is used throughout the app for consistency.
- **API Communication:** All server requests go through `client/src/utils/api.js`, which handles token injection and common error logic.

### Backend (Node/Express)
- **Database:** `better-sqlite3` is used for high-performance, single-file SQLite database management. The schema is defined in `server/db/database.js`.
- **Real-time:** `socket.io` handles real-time messaging. Users are mapped by their IDs to socket IDs.
- **Authentication:** JWT-based authentication via `server/middleware/auth.js`.
- **File Uploads:** `multer` handles uploads for profile pictures and listing images, which are stored in the `/uploads` directory.

## 🚦 Key Flows

### 💬 Messaging Flow
1. User sends a message via the UI.
2. The `POST /api/messages` endpoint creates a record in the database.
3. The server then emits a `new_message` event via Socket.io to the recipient if they are online.

### 💰 Payment Flow (Placeholder)
The application is set up for [PayFast](https://www.payfast.co.za/) integration. The `server/routes/payments.js` file contains placeholders for handling payment verification and IPN callbacks.

## ⚠️ Known Gaps & Future Work

1.  **Production Hardening:** While the code is robust for a prototype, it uses `process.env.PORT` but doesn't have a `.env.production` setup yet.
2.  **Payment Verification:** The `verifyPayment` API currently returns mock results and needs full PayFast integration.
3.  **Real-time Notifications:** While messaging is real-time, push notifications (using a service like Firebase) have not been implemented yet.

## 🧪 Testing
Manual testing is currently the primary verification method. End-to-end tests using Playwright or Cypress should be added as the project scales.
