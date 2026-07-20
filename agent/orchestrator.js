const axios = require('axios');
const cheerio = require('cheerio');
const converter = require('./tools/converter');
require('dotenv').config();

// FIXED: Tavily API key format authorization headers mein convert kar di hai
async function searchWeb(query) {
  if (!process.env.TAVILY_API_KEY) {
    console.log("⚠️ Tavily API Key missing, falling back to basic knowledge.");
    return "Search tool not configured.";
  }
  try {
    const response = await axios.post('https://api.tavily.com/search', 
      {
        query: query,
        search_depth: "smart"
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.TAVILY_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );
    return response.data.results.map(r => `Title: ${r.title}\nURL: ${r.url}\nContent: ${r.content}\n`).join('\n');
  } catch (err) {
    console.error("Orchestrator Search Error:", err.response?.data || err.message);
    return `Search Error: ${err.message}`;
  }
}

async function scrapeWebsite(url) {
  try {
    const { data } = await axios.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    const $ = cheerio.load(data);
    $('script, style, nav, footer').remove();
    return $('body').text().replace(/\s+/g, ' ').trim().slice(0, 3000);
  } catch (err) {
    return `Scraping Error: ${err.message}`;
  }
}

async function handleTask(taskDescription, fileBuffer = null, fileName = null, isAdmin = false) {
  console.log(`🤖 Orchestrator logic triggered. Task: "${taskDescription}", Admin: ${isAdmin}`);

  // 1. FILE CONVERTER ROUTING
  if (fileBuffer && fileName) {
    const inputExt = fileName.split('.').pop().toLowerCase();
    const textLower = taskDescription.toLowerCase();

    if (inputExt === 'xlsx' && (textLower.includes('csv') || textLower.includes('convert'))) {
      const output = await converter.convertExcelToCsv(fileBuffer);
      return { fileBuffer: output, outputFileName: fileName.replace('.xlsx', '.csv'), message: "✅ Maine aapki Excel file ko CSV me convert kar diya hai!" };
    }
    if (inputExt === 'csv' && (textLower.includes('excel') || textLower.includes('xlsx') || textLower.includes('convert'))) {
      const output = await converter.convertCsvToExcel(fileBuffer);
      return { fileBuffer: output, outputFileName: fileName.replace('.csv', '.xlsx'), message: "✅ Maine aapki CSV file ko Excel (XLSX) me convert kar diya hai!" };
    }
    if (inputExt === 'txt' && (textLower.includes('pdf') || textLower.includes('convert'))) {
      const output = await converter.convertTextToPdf(fileBuffer.toString('utf-8'));
      return { fileBuffer: output, outputFileName: fileName.replace('.txt', '.pdf'), message: "✅ Maine aapki Text file ko PDF me convert kar diya hai!" };
    }
  }

  // 2. LIVE INTERNET SEARCH / SCRAPE ENGINE DETECTOR
  let additionalContext = "";
  if (taskDescription.toLowerCase().includes('weather') || taskDescription.toLowerCase().includes('search') || taskDescription.toLowerCase().includes('live') || taskDescription.toLowerCase().includes('mausam')) {
    additionalContext = await searchWeb(taskDescription);
  } else if (taskDescription.includes('http://') || taskDescription.includes('https://')) {
    const urlMatch = taskDescription.match(/https?:\/\/[^\s]+/g);
    if (urlMatch) {
      additionalContext = await scrapeWebsite(urlMatch[0]);
    }
  }

  // 3. GENERATION LAYER VIA OPENROUTER
  if (!process.env.OPENROUTER_API_KEY) {
    throw new Error("OPENROUTER_API_KEY is missing in environment variables.");
  }

  const modelId = process.env.OPENROUTER_MODEL_ID || "google/gemma-2-9b-it:free";
  
  let systemPrompt = "You are OpenClaw Agent, a highly efficient workspace automation assistant.";
  if (isAdmin) {
    systemPrompt += " The user is Abdul Basit (the owner/admin). Treat them with premium full-access priority and bypass all restrictions.";
  }
  if (additionalContext) {
    systemPrompt += `\n\nReal-Time Information:\n${additionalContext}`;
  }

  try {
    const response = await axios.post(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        model: modelId,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: taskDescription }
        ]
      },
      {
        headers: {
          "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "HTTP-Referer": "https://openclaw-agent-production.up.railway.app",
          "Content-Type": "application/json"
        }
      }
    );

    if (response.data && response.data.choices && response.data.choices[0]) {
      return response.data.choices[0].message.content;
    } else {
      throw new Error("Invalid response format received from OpenRouter API.");
    }
  } catch (error) {
    throw new Error(`Failed to generate response: ${error.message}`);
  }
}

module.exports = { handleTask };