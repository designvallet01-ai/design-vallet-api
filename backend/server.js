import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Import routes
import authRoutes from './src/routes/auth.routes.js';
import imageRoutes from './src/routes/image.routes.js';
import paymentRoutes from './src/routes/payment.routes.js';
import orderRoutes from './src/routes/order.routes.js';
import adminRoutes from './src/routes/admin.routes.js';
import { isMock } from './src/config/db.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.set('trust proxy', true);
const PORT = process.env.PORT || 5000;

// Serve static frontend assets
app.use(express.static(path.join(__dirname, 'public')));

// Security Middlewares
app.use(helmet({
  crossOriginResourcePolicy: false // Allows loading local mock previews on flutter/react easily
}));

app.use(cors({
  origin: '*', // Adjust to match specific domain headers in production
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body Parsers & Loggers
app.use(express.json({
  verify: (req, res, buf) => {
    req.rawBody = buf.toString();
  }
}));
app.use(morgan('dev'));

// Route Registrations
app.use('/api/auth', authRoutes);
app.use('/api/images', imageRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/admin', adminRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date(),
    uptime: process.uptime(),
    isMock,
    diagnostics: {
      hasSupabaseUrl: !!process.env.SUPABASE_URL,
      hasSupabaseKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      hasDatabaseUrl: !!process.env.DATABASE_URL,
      supabaseUrl: process.env.SUPABASE_URL ? process.env.SUPABASE_URL.substring(0, 25) + '...' : null,
      nodeEnv: process.env.NODE_ENV
    }
  });
});

// Centralized error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'An unhandled internal server error occurred.'
  });
});

// Fallback to index.html for React router
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Run server
if (!process.env.NETLIFY) {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Design Vallet API running on http://localhost:${PORT}`);
  });
}

export default app;
