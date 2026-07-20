require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const multer = require('multer'); // File uploads handle karne ke liye
const converter = require('./agent/tools/converter');

// Multer storage configuration (Memory me rakhne ke liye taake direct convert ho ske)
const upload = multer({ storage: multer.memoryStorage() });

// Asli AI Discord Bot ko import karein
const client = require('./discordBot');

// Config and Port Setup
const app = express();
const PORT = process.env.PORT || 3000;

// Express Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve Static Files (For Dashboard HTML, CSS, JS)
app.use(express.static(path.join(__dirname, 'public')));

// ==========================================
// 1. MONGODB CONNECTION
// ==========================================
const mongoURI = process.env.MONGODB_URI || process.env.MONGO_DB_URI || 'mongodb+srv://basit420:basit12345@cluster0.43v1nov.mongodb.net/openclaw?appName=Cluster0';

mongoose.connect(mongoURI)
  .then(() => console.log('🍀 Connected to MongoDB Successfully!'))
  .catch(err => console.error('❌ MongoDB Connection Error:', err));

// ==========================================
// 2. API ENDPOINTS (WEB DASHBOARD & ADMIN PANEL)
// ==========================================

// Dashboard Route
app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

// Admin Panel Route (🔒 Secure Basic Authentication)
app.get('/admin', (req, res) => {
  // Username 'admin' rahega aur password aapki preference ke mutabiq
  const auth = { login: 'admin', password: process.env.ADMIN_PASSWORD || 'basit123' };
  const b64auth = (req.headers.authorization || '').split(' ')[1] || '';
  const [login, password] = Buffer.from(b64auth, 'base64').toString().split(':');

  if (login && password && login === auth.login && password === auth.password) {
    return res.sendFile(path.join(__dirname, 'public', 'admin.html'));
  }

  // Agar password galat hai toh login popup aayega
  res.set('WWW-Authenticate', 'Basic realm="401"');
  res.status(401).send('Authentication required. Admin panel access denied.');
});

// NEW FEATURE: Dashboard Web File Converter Endpoint
app.post('/api/convert', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Koi file upload nahi ki gayi.' });
    }

    const targetFormat = req.body.format; // 'csv', 'excel', 'pdf'
    const inputExt = req.file.originalname.split('.').pop().toLowerCase();
    let outputBuffer = null;
    let outputFileName = '';
    let contentType = '';

    if (inputExt === 'xlsx' && targetFormat === 'csv') {
      outputBuffer = await converter.convertExcelToCsv(req.file.buffer);
      outputFileName = req.file.originalname.replace('.xlsx', '.csv');
      contentType = 'text/csv';
    } else if (inputExt === 'csv' && (targetFormat === 'excel' || targetFormat === 'xlsx')) {
      outputBuffer = await converter.convertCsvToExcel(req.file.buffer);
      outputFileName = req.file.originalname.replace('.csv', '.xlsx');
      contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    } else if (inputExt === 'txt' && targetFormat === 'pdf') {
      outputBuffer = await converter.convertTextToPdf(req.file.buffer.toString('utf-8'));
      outputFileName = req.file.originalname.replace('.txt', '.pdf');
      contentType = 'application/pdf';
    } else {
      return res.status(400).json({ error: 'Unsupported conversion format stream.' });
    }

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${outputFileName}"`);
    res.send(outputBuffer);

  } catch (error) {
    console.error('❌ Web Conversion Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Discord OAuth authorization URL
app.get('/api/auth/url', (req, res) => {
  const clientId = process.env.DISCORD_CLIENT_ID || process.env.DISCORD_BOT_CLIENT_ID;
  const redirectUri = process.env.DISCORD_REDIRECT_URI || `${req.protocol}://${req.get('host')}/api/auth/discord/callback`;

  if (!clientId) {
    return res.status(500).json({ error: 'Discord client ID is not configured.' });
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'identify email',
    prompt: 'consent'
  });

  res.json({ url: `https://discord.com/api/oauth2/authorize?${params.toString()}` });
});

app.get('/api/auth/discord/callback', (req, res) => {
  res.redirect('/dashboard.html');
});

app.post('/api/webhooks', (req, res) => {
  res.status(200).json({ message: 'Webhook received' });
});

// Live Connected Web Search API
app.post('/api/search', async (req, res) => {
  try {
    const { query } = req.body;
    if (!process.env.TAVILY_API_KEY) {
      return res.status(400).json({ error: 'Tavily Key is missing.' });
    }
    const axios = require('axios');
    const response = await axios.post('https://api.tavily.com/search', {
      api_key: process.env.TAVILY_API_KEY,
      query: query
    });
    res.status(200).json({ success: true, results: response.data.results });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// 3. SERVER START
// ==========================================
app.listen(PORT, () => {
  console.log(`⚡ Server running dynamically on port ${PORT}`);
});