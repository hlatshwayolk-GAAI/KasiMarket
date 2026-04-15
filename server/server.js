const express = require('express');
const cors = require('cors');
const path = require('path');
const { createServer } = require('http');
const { Server } = require('socket.io');
const { getDb } = require('./db/database');

const authRoutes = require('./routes/auth');
const categoriesRoutes = require('./routes/categories');
const listingsRoutes = require('./routes/listings');
const requestsRoutes = require('./routes/requests');
const quotesRoutes = require('./routes/quotes');
const messagesRoutes = require('./routes/messages');
const searchRoutes = require('./routes/search');
const notificationsRoutes = require('./routes/notifications');
const reviewsRoutes = require('./routes/reviews');
const adminRoutes = require('./routes/admin');
const bookingsRoutes = require('./routes/bookings');
const paymentsRoutes = require('./routes/payments');
const analyticsRoutes = require('./routes/analytics');
const favoritesRoutes = require('./routes/favorites');

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: '*' } });

const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// Init DB
getDb();

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/categories', categoriesRoutes);
app.use('/api/listings', listingsRoutes);
app.use('/api/requests', requestsRoutes);
app.use('/api/quotes', quotesRoutes);
app.use('/api/messages', messagesRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/reviews', reviewsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/bookings', bookingsRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/favorites', favoritesRoutes);

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// Socket.io for real-time messaging
const onlineUsers = new Map();

io.on('connection', (socket) => {
  socket.on('user_online', (userId) => {
    onlineUsers.set(userId, socket.id);
    socket.userId = userId;
  });

  socket.on('send_message', (data) => {
    const { receiver_id, message } = data;
    const receiverSocket = onlineUsers.get(receiver_id);
    if (receiverSocket) {
      io.to(receiverSocket).emit('new_message', message);
    }
  });

  socket.on('typing', (data) => {
    const receiverSocket = onlineUsers.get(data.receiver_id);
    if (receiverSocket) {
      io.to(receiverSocket).emit('user_typing', { sender_id: socket.userId });
    }
  });

  socket.on('disconnect', () => {
    if (socket.userId) onlineUsers.delete(socket.userId);
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

httpServer.listen(PORT, () => {
  console.log(`\n🏪 Kasi Market API running on http://localhost:${PORT}`);
  console.log(`📦 Database initialized`);
  console.log(`🔌 WebSocket ready for messaging\n`);
});
