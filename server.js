const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const { Client, GatewayIntentBits, Partials } = require('discord.js');

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
mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/openclaw')
  .then(() => console.log('🍀 Connected to MongoDB Successfully!'))
  .catch(err => console.error('❌ MongoDB Connection Error:', err));

// ==========================================
// 2. DISCORD BOT SETUP (WITH CORRECT INTENTS)
// ==========================================
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent, // <-- Message read karne ke liye sabse zaroori intent
    GatewayIntentBits.GuildMembers,   // <-- Active checks ke liye
    GatewayIntentBits.DirectMessages  // <-- Direct Message support ke liye
  ],
  partials: [
    Partials.Channel,
    Partials.Message,
    Partials.User
  ]
});

// Bot Online Status
client.once('ready', () => {
  console.log(`🚀 Discord Bot logged in successfully as: ${client.user.tag}`);
});

// Bot Message Event Handler (Jab Discord pe message aaye)
client.on('messageCreate', async (message) => {
  // Agar message bot khud bhej raha hai, toh ignore karein
  if (message.author.bot) return;

  console.log(`📝 Naya message aaya [${message.channel.name || 'DM'}]: "${message.content}" from ${message.author.tag}`);

  const text = message.content.toLowerCase().trim();

  // 1. Simple Test Command
  if (text === 'hi' || text === 'hello') {
    return message.reply('Hello Bhai! Main bilkul active hoon aur sun raha hoon. Aap mujhse koi bhi sawal pooch sakte hain!');
  }

  // 2. Integration with Web Search or Image Generation
  // (Yahan aap apna main processing agent call kar sakte hain)
});

// Bot Login
if (process.env.DISCORD_TOKEN) {
  client.login(process.env.DISCORD_TOKEN)
    .catch(err => console.error('❌ Discord Bot Login Failed:', err));
} else {
  console.log('⚠️ DISCORD_TOKEN variables me missing hai. Bot start nahi hua.');
}

// ==========================================
// 3. API ENDPOINTS (WEB DASHBOARD)
// ==========================================

// Dashboard Route (Jo images me successfully status 200 de raha tha)
app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
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
    
    // Yahan aapki Tavily search processing logic aayegi
    res.status(200).json({ success: true, message: "Search processed" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// 4. SERVER START
// ==========================================
app.listen(PORT, () => {
  console.log(`⚡ Server running dynamically on port ${PORT}`);
});