const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const http = require('http');
const socketIo = require('socket.io');

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
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compression middleware (optional - only if installed)
try {
  const compression = require('compression');
  app.use(compression({
    level: 6, // Compression level (0-9)
    threshold: 1024, // Only compress responses larger than 1KB
    filter: (req, res) => {
      if (req.headers['x-no-compression']) {
        return false;
      }
      return compression.filter(req, res);
    }
  }));
  console.log('✓ Compression enabled');
} catch (err) {
  console.log('ℹ Compression not available, continuing without it');
}

// Request timeout middleware
app.use((req, res, next) => {
  req.setTimeout(30000); // 30 second timeout
  res.setTimeout(30000);
  next();
});

// Response time logging (development only)
if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      if (duration > 1000) {
        console.log(`⚠️ Slow request: ${req.method} ${req.path} - ${duration}ms`);
      }
    });
    next();
  });
}

// MongoDB Connection with optimizations
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/tuition-app', {
  maxPoolSize: 20, // Increased connection pool
  minPoolSize: 5,
  socketTimeoutMS: 45000,
  serverSelectionTimeoutMS: 10000,
  family: 4, // Use IPv4
  retryWrites: true,
  retryReads: true
})
.then(() => {
  console.log('✓ MongoDB Connected');
  // Enable query logging in development
  if (process.env.NODE_ENV === 'development') {
    mongoose.set('debug', true);
  }
})
.catch(err => {
  console.error('❌ MongoDB Error:', err);
  process.exit(1); // Exit if database connection fails
});

// Handle MongoDB connection errors after initial connection
mongoose.connection.on('error', err => {
  console.error('MongoDB connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.warn('MongoDB disconnected. Attempting to reconnect...');
});

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
    version: '1.1.20',
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
app.use('/api/crash-logs', require('./routes/crashLogs'));
app.use('/api/maintenance', require('./routes/maintenance'));
app.use('/api/license', require('./routes/license'));
app.use('/api/system-settings', require('./routes/systemSettings'));

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(err.status || 500).json({
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`✓ Server running on port ${PORT}`);
  console.log(`✓ Environment: ${process.env.NODE_ENV || 'development'}`);
});
