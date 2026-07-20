require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const axios = require('axios');
const converter = require('./agent/tools/converter');

const upload = multer({ storage: multer.memoryStorage() });
const client = require('./discordBot');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Fallback configuration for Dynamic MongoDB Strings
const mongoURI = process.env.MONGODB_URI || process.env.MONGO_DB_URI;

if (!mongoURI) {
  console.error("❌ CRITICAL: No Database connection string found in Environment variables.");
} else {
  mongoose.connect(mongoURI)
    .then(() => console.log('🍀 Connected to MongoDB Successfully!'))
    .catch(err => console.error('❌ MongoDB Connection Error:', err));
}

// Routes Definition
app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

app.get('/admin', (req, res) => {
  const auth = { login: 'admin', password: process.env.ADMIN_PASSWORD || 'basit123' };
  const b64auth = (req.headers.authorization || '').split(' ')[1] || '';
  const [login, password] = Buffer.from(b64auth, 'base64').toString().split(':');

  if (login && password && login === auth.login && password === auth.password) {
    return res.sendFile(path.join(__dirname, 'public', 'admin.html'));
  }

  res.set('WWW-Authenticate', 'Basic realm="401"');
  res.status(401).send('Authentication required. Admin panel access denied.');
});

// FINAL PERFECTED: Weather JSON parser + Clean line breaks formatting
app.post(['/api/search', '/api/tools/search'], async (req, res) => {
  try {
    let { query } = req.body;
    if (!query) return res.status(400).json({ success: false, error: 'Query missing hai.' });
    if (!process.env.TAVILY_API_KEY) return res.status(400).json({ success: false, error: 'Tavily Key is missing.' });

    if (query.toLowerCase().startsWith('!agent ')) {
      query = query.slice(7);
    }

    const response = await axios.post('https://api.tavily.com/search', {
      api_key: process.env.TAVILY_API_KEY,
      query: query.trim(),
      search_depth: "basic",
      include_answer: false
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const rawResults = response.data.results || [];
    
    const formattedText = rawResults.map((result, index) => {
      let cleanContent = result.content;
      
      // Weather API ke single/double quotes wale kachre ko saaf karne ke liye regex
      if (cleanContent.includes("'temp_c'") || cleanContent.includes('"temp_c"')) {
        const tempMatch = cleanContent.match(/['"]temp_c['"]:\s*([0-9.]+)/);
        const textMatch = cleanContent.match(/['"]text['"]:\s*['"]([^'"]+)['"]/);
        const humidMatch = cleanContent.match(/['"]humidity['"]:\s*([0-9.]+)/);
        
        if (tempMatch && textMatch) {
          cleanContent = `Temperature: ${tempMatch[1]}°C, Condition: ${textMatch[1]}${humidMatch ? `, Humidity: ${humidMatch[1]}%` : ''}`;
        } else {
          cleanContent = cleanContent.replace(/[{}\[\]'"]/g, ' ').replace(/[\r\n]+/g, ' ').trim();
        }
      } else {
        cleanContent = cleanContent.replace(/[\r\n]+/g, ' ').trim();
      }

      const cleanTitle = result.title.replace(/[\r\n]+/g, ' ').trim();
      const cleanUrl = result.url.replace(/[\r\n]+/g, ' ').trim();

      return `[${index + 1}] ${cleanTitle.toUpperCase()}\nLink: ${cleanUrl}\nInfo: ${cleanContent}\n`;
    }).join('\n');

    res.status(200).json({ 
      success: true, 
      results: formattedText || "Koi results nahi mile." 
    });
  } catch (error) {
    console.error("Tavily Route Error:", error.response?.data || error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/tools/imagine', async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt) return res.status(400).json({ success: false, error: 'Prompt missing hai.' });

    const mockImageUrl = `https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=600`;
    res.status(200).json({ success: true, imageUrl: mockImageUrl });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/convert', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Koi file upload nahi ki gayi.' });

    const targetFormat = req.body.format;
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
      return res.status(400).json({ error: 'Unsupported conversion format.' });
    }

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${outputFileName}"`);
    res.send(outputBuffer);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/admin/stats', async (req, res) => {
  res.status(200).json({
    totalUsers: 1,
    premiumUsers: 1,
    recentLogs: [
      { timestamp: new Date(), message: "System online. All routes synced." },
      { timestamp: new Date(), message: "Database connection stable." }
    ]
  });
});

app.get('/api/auth/url', (req, res) => {
  const clientId = process.env.DISCORD_CLIENT_ID || process.env.DISCORD_BOT_CLIENT_ID;
  const redirectUri = process.env.DISCORD_REDIRECT_URI || `${req.protocol}://${req.get('host')}/api/auth/discord/callback`;

  if (!clientId) return res.status(500).json({ error: 'Discord client ID is not configured.' });

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

app.listen(PORT, () => {
  console.log(`⚡ Server running dynamically on port ${PORT}`);
});