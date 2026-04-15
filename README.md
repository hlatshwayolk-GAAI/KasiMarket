# 🏪 Kasi Market

**Kasi Market** is a premium community-driven marketplace designed to connect local service providers with customers in South African townships (Kasis). From welding and gardening to plumbing and childcare, Kasi Market makes it easy to find and offer local work.

## ✨ Features

- **Service Listings:** Providers can showcase their services with pricing, images, and availability.
- **Service Requests:** Customers can post specific jobs they need help with.
- **Real-time Messaging:** Direct communication between customers and providers via Socket.io.
- **Admin Dashboard:** Powerful tools for managing users, listings, and requests.
- **Booking System:** Track and manage job bookings from start to finish.
- **Payment Integration:** Secure payment flows (ready for PayFast integration).
- **Responsive Design:** A modern, premium dark-themed UI optimized for all devices.

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v16 or higher)
- [npm](https://www.npmjs.com/) (usually comes with Node.js)

### Installation

1. Clone the repository (or navigate to the project directory).
2. Install dependencies for the root, server, and client:
   ```bash
   npm run install:all
   ```

### Running the Application

To start both the backend API and the frontend development server concurrently:

```bash
npm run dev
```

- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:3001

### Database

The application uses **SQLite** (`kasi_market.db`). It is automatically initialized and seeded with demo data on the first run. To manually re-seed:

```bash
npm run seed
```

## 🛠️ Technology Stack

- **Frontend:** React, Vite, Lucide React, Socket.io-client.
- **Backend:** Node.js, Express, Better-SQLite3, Socket.io.
- **Styling:** Custom Design System (Vanilla CSS).

## 📂 Project Structure

- `client/`: React frontend.
- `server/`: Express backend and database.
- `uploads/`: User-uploaded images for listings and profiles.
- `media/`: Brand assets and static media.

---
Built for the community. **Local Spane. Local Work.**
