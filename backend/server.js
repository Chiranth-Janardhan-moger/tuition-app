const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const http = require('http');
const socketIo = require('socket.io');
const compression = require("compression");
app.use(compression());


dotenv.config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' })); // Limit payload size
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compression middleware for responses (optional)
try {
  const compression = require('compression');
  app.use(compression());
  console.log('Compression enabled');
} catch (err) {
  console.log('Compression not available, continuing without it');
}

// MongoDB Connection with optimizations
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/tuition-app', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  maxPoolSize: 10, // Connection pool size
  minPoolSize: 2,
  socketTimeoutMS: 45000,
  serverSelectionTimeoutMS: 5000,
  family: 4 // Use IPv4
})
.then(() => {
  console.log('MongoDB Connected');
  // Enable query logging in development
  if (process.env.NODE_ENV === 'development') {
    mongoose.set('debug', true);
  }
})
.catch(err => console.log('MongoDB Error:', err));

// Socket.io for real-time chat
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join-chat', (userId) => {
    socket.join(userId);
  });

  socket.on('send-message', (data) => {
    io.to(data.receiverId).emit('receive-message', data);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Root route - Server status
app.get('/', (req, res) => {
  res.json({
    status: 'success',
    message: '🎓 EduManage API Server is running!',
    version: '1.0.11',
    timestamp: new Date().toISOString(),
    endpoints: {
      auth: '/api/auth',
      students: '/api/students',
      fees: '/api/fees',
      attendance: '/api/attendance',
      timings: '/api/timings',
      chat: '/api/chat',
      leave: '/api/leave',
      query: '/api/query',
      announcements: '/api/announcements'
    }
  });
});

// API Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/students', require('./routes/students'));
app.use('/api/fees', require('./routes/fees'));
app.use('/api/attendance', require('./routes/attendance'));
app.use('/api/timings', require('./routes/timings'));
app.use('/api/chat', require('./routes/chat'));
app.use('/api/leave', require('./routes/leave'));
app.use('/api/query', require('./routes/query'));
app.use('/api/announcements', require('./routes/announcements'));

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
