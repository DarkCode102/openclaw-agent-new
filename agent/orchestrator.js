const axios = require('axios');
require('dotenv').config();

async function handleTask(taskDescription) {
  console.log(`🤖 Orchestrator processing task with Gemma 4: "${taskDescription}"`);
  
  if (!process.env.OPENROUTER_API_KEY) {
    throw new Error("OPENROUTER_API_KEY is missing in your environment configuration.");
  }

  const modelId = process.env.OPENROUTER_MODEL_ID || "google/gemma-4-26b-a4b-it:free";

  try {
    const response = await axios.post(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        model: modelId,
        messages: [
          {
            role: "system",
            content: "You are OpenClaw Agent, a highly efficient workspace automation assistant powered by Gemma 4."
          },
          {
            role: "user",
            content: taskDescription
          }
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
    console.error("❌ OpenRouter Error Details:", error.response ? error.response.data : error.message);
    throw new Error(`Failed to generate response using Gemma 4 model: ${error.message}`);
  }
}

module.exports = { handleTask };