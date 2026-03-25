const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();

// Middleware
app.use(express.json());
// --- CORS Configuration ---
const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim()) 
  : ['http://localhost:5503', 'http://127.0.0.1:5503', 'http://localhost:5500', 'http://127.0.0.1:5500', 'http://localhost:5000'];

const corsOptions = {
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        
        if (allowedOrigins.indexOf(origin) !== -1 || allowedOrigins.includes('*')) {
            callback(null, true);
        } else {
            console.warn(`[CORS Blocked]: Origin ${origin} not in allowed list:`, allowedOrigins);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));

// Global Request Logger
app.use((req, res, next) => {
    console.log(`📡 [REQUEST] ${req.method} ${req.url}`);
    next();
});

// Serve Static Frontend Files
app.use(express.static(path.join(__dirname, '../frontend')));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/questions', require('./routes/questions'));
app.use('/api/answers', require('./routes/answers'));
app.use('/api/votes', require('./routes/votes'));
app.use('/api/activity', require('./routes/activity'));
app.use('/api/tags', require('./routes/tags'));
app.use('/api/stats', require('./routes/stats'));
app.use('/api/notifications', require('./routes/notifications'));

// Fallback to index.html for unknown frontend routes
app.use((req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// MongoDB Connection Logic
mongoose.set('strictQuery', false);

const connectDB = async () => {
  console.log("⏳ [DATABASE] Connecting to MongoDB Atlas...");
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ [DATABASE] MongoDB connected successfully!");
    console.log(`📡 [DATABASE] Connected to: "${conn.connection.name}"`);
    console.log(`🌐 [DATABASE] Host: ${conn.connection.host}`);
  } catch (err) {
    console.error("❌ [DATABASE ERROR] Connection failed!");
    console.error("   Reason:", err.message);
  }
};

connectDB();

// Global Error Handler
app.use((err, req, res, next) => {
    console.error('\n💥 [GLOBAL ERROR] ----------------');
    console.error('   URL:', req.url);
    console.error('   Message:', err.message);
    console.error('------------------------------------\n');
    res.status(500).json({ success: false, error: err.message });
});

// Start Server with Error Handling
const PORT = parseInt(process.env.PORT) || 5000;
const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n************************************************`);
    console.log(`🚀 [SERVER] LINA COMMUNITY BACKEND IS ONLINE!`);
    console.log(`📡 [SERVER] Listening on: http://localhost:${PORT}`);
    console.log(`************************************************\n`);
});

server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.error(`\n❌ [PORT CONFLICT] Port ${PORT} is already in use by another application.`);
        console.error(`👉 ACTION: Close the other application or change the PORT in your .env file to 5001.`);
    } else {
        console.error(`\n❌ [STARTUP ERROR] Something went wrong while starting the server:`);
        console.error(err.message);
    }
    process.exit(1);
});
