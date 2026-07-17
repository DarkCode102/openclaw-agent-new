require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

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
mongoose.connect(process.env.MONGO_DB_URI || 'mongodb+srv://basit420:basit12345@cluster0.43v1nov.mongodb.net/openclaw?appName=Cluster0')
  .then(() => console.log('🍀 Connected to MongoDB Successfully!'))
  .catch(err => console.error('❌ MongoDB Connection Error:', err));

// ==========================================
// 2. API ENDPOINTS (WEB DASHBOARD)
// ==========================================

// Dashboard Route
app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

// Discord OAuth authorization URL endpoint used by the login button
app.get('/api/auth/url', (req, res) => {
  const clientId = process.env.DISCORD_CLIENT_ID || process.env.DISCORD_BOT_CLIENT_ID;
  const redirectUri = process.env.DISCORD_REDIRECT_URI || `${req.protocol}://${req.get('host')}/api/auth/discord/callback`;

  if (!clientId) {
    console.error('❌ Discord client ID missing. Set DISCORD_CLIENT_ID or DISCORD_BOT_CLIENT_ID in your environment.');
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

// OAuth Callback Route
app.get('/api/auth/discord/callback', (req, res) => {
  console.log('🔗 OAuth Callback Hit!');
  res.redirect('/dashboard.html'); // redirect to dashboard
});

// Webhook handling
app.post('/api/webhooks', (req, res) => {
  res.status(200).json({ message: 'Webhook received' });
});

// Web Search API (Tavily search integration)
app.post('/api/search', async (req, res) => {
  try {
    const { query } = req.body;
    console.log(`🔍 Web search query received: ${query}`);
    res.status(200).json({ success: true, message: "Search processed" });
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