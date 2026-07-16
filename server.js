const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const fetch = require('node-fetch');
const connectDB = require('./db');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Mongoose Schemas & Models
const UserSchema = new mongoose.Schema({
  discordId: String,
  username: String,
  joinedAt: { type: Date, default: Date.now },
  status: { type: String, default: 'trial' },
  role: { type: String, default: 'user' }
});
const User = mongoose.models.User || mongoose.model('User', UserSchema);

const LogSchema = new mongoose.Schema({
  username: String,
  action: String,
  query: String,
  timestamp: { type: Date, default: Date.now }
});
const Log = mongoose.models.Log || mongoose.model('Log', LogSchema);

// Connect DB & Start Discord Bot
connectDB().then(() => {
  require('./discordBot');
});

// OAuth API Links
app.get('/api/auth/url', (req, res) => {
  res.json({ url: process.env.DISCORD_OAUTH_URL });
});

// Discord Callback (Registration / Login)
app.get('/api/auth/discord/callback', async (req, res) => {
  const { code } = req.query;
  if (!code) return res.send("Authorization code missing.");

  try {
    const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      body: new URLSearchParams({
        client_id: process.env.DISCORD_CLIENT_ID,
        client_secret: process.env.DISCORD_CLIENT_SECRET,
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: process.env.DISCORD_REDIRECT_URI,
      }),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    
    const tokens = await tokenResponse.json();
    const userResponse = await fetch('https://discord.com/api/users/@me', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    const discordUser = await userResponse.json();

    let user = await User.findOne({ discordId: discordUser.id });
    if (!user) {
      user = await User.create({ discordId: discordUser.id, username: discordUser.username });
    }

    res.redirect(`/dashboard.html?username=${user.username}&id=${user._id}`);
  } catch (err) {
    res.status(500).send("Login failed: " + err.message);
  }
});

// Search Tool Endpoint
app.post('/api/tools/search', async (req, res) => {
  const { query, userId } = req.body;
  try {
    const user = await User.findById(userId);
    if (!user) return res.json({ success: false, error: "User not found." });
    if (user.status === 'expired') return res.json({ success: false, error: "Trial Expired. Please Upgrade." });

    const response = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ api_key: process.env.TAVILY_API_KEY, query })
    });
    const data = await response.json();

    await Log.create({ username: user.username, action: 'search', query });
    res.json({ success: true, results: data.results });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// Imagine (AI Image Generator) Mock Endpoint
app.post('/api/tools/imagine', async (req, res) => {
  const { prompt, userId } = req.body;
  try {
    const user = await User.findById(userId);
    if (!user) return res.json({ success: false, error: "User not found." });
    if (user.status === 'expired') return res.json({ success: false, error: "Trial Expired." });

    await Log.create({ username: user.username, action: 'image_generation', query: prompt });
    res.json({ success: true, imageUrl: `https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=600` });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// Admin Statistics Dashboard Endpoint
app.get('/api/admin/stats', async (req, res) => {
  const adminId = req.headers['admin-id'];
  try {
    const adminUser = await User.findById(adminId);
    if (!adminUser || adminUser.role !== 'admin') {
      return res.status(403).json({ error: "Access Denied: Admin privileges required." });
    }

    const totalUsers = await User.countDocuments();
    const premiumUsers = await User.countDocuments({ status: 'premium' });
    const recentLogs = await Log.find().sort({ timestamp: -1 }).limit(20);

    res.json({ totalUsers, premiumUsers, recentLogs });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running dynamically on port ${PORT}`));