const { Client, GatewayIntentBits, Partials, AttachmentBuilder } = require('discord.js');
const { handleTask } = require('./agent/orchestrator');
const axios = require('axios');
require('dotenv').config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent, 
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.DirectMessages
  ],
  partials: [
    Partials.Channel,
    Partials.Message,
    Partials.User
  ]
});

client.once('ready', () => {
  console.log(`🤖 Discord Bot logged in as ${client.user.tag}`);
});

// Helper function: Badi responses ko 2000 chars ke chunks me todne ke liye
function splitMessage(text, maxLength = 1900) {
  const chunks = [];
  let currentChunk = "";
  const lines = text.split("\n");

  for (const line of lines) {
    if ((currentChunk + line).length > maxLength) {
      chunks.push(currentChunk);
      currentChunk = "";
    }
    currentChunk += line + "\n";
  }
  if (currentChunk.trim()) {
    chunks.push(currentChunk);
  }
  return chunks;
}

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  console.log(`📝 Naya message aaya [${message.channel.name || 'DM'}]: "${message.content}" from ${message.author.tag}`);

  // Pure Admin Premium Bypass Verification
  const isAdmin = message.author.username === 'abdulbasit0509';
  if (isAdmin) {
    console.log(`👑 Admin Abdul Basit detected! Premium trial bypass activated.`);
  }

  let task = message.content.trim();

  // FIX: Check agar message DM mein hai, ya bot ko tag kiya gaya hai, ya koi file bhejiyi gayi hai
  const isDM = message.channel.type === 1; // 1 = DM Channel
  const isMentioned = message.mentions.has(client.user) && !message.mentions.everyone;
  const hasAttachment = message.attachments.size > 0;

  // Simple Greetings System
  if (task.toLowerCase() === 'hi' || task.toLowerCase() === 'hello') {
    return message.reply('Hello Bhai! Main bilkul active hoon aur sun raha hoon. Aap mujhse koi bhi sawal ya file conversion ka kaam pooch sakte hain!');
  }

  // Agar DM hai, tag kiya hai, ya file hai toh bina prefix ke process karega
  if (isDM || isMentioned || hasAttachment) {
    // Agar mention kiya hai toh message me se bot ka tag saaf karne ke liye
    if (isMentioned) {
      task = task.replace(new RegExp(`<@!?${client.user.id}>`, 'g'), '').trim();
    }

    const processingMessage = await message.channel.send('⚙️ OpenClaw Agent is processing your request...');
    
    try {
      let fileBuffer = null;
      let fileName = null;

      // Attachment handling block
      if (message.attachments.size > 0) {
        const attachment = message.attachments.first();
        fileName = attachment.name;
        const response = await axios.get(attachment.url, { responseType: 'arraybuffer' });
        fileBuffer = Buffer.from(response.data);
        console.log(`📁 File attachment receive hui: ${fileName}`);
      }

      console.log(`🧠 AI Agent is processing task: "${task}"`);
      
      const agentResponse = await handleTask(task, fileBuffer, fileName, isAdmin);

      // Agar response object streams me converted file validation milti hai
      if (agentResponse && agentResponse.fileBuffer) {
        const attachment = new AttachmentBuilder(agentResponse.fileBuffer, { name: agentResponse.outputFileName });
        await message.reply({ content: agentResponse.message, files: [attachment] });
      } else {
        const textResponse = agentResponse || "Processing complete with no output content.";
        
        // Agar coding ya text ka response Discord ki 2000 limit se bada hai toh break karega
        if (textResponse.length > 2000) {
          const chunks = splitMessage(textResponse);
          for (let i = 0; i < chunks.length; i++) {
            if (i === 0) {
              await message.reply(chunks[i]);
            } else {
              await message.channel.send(chunks[i]);
            }
          }
        } else {
          await message.reply(textResponse);
        }
      }

    } catch (err) {
      console.error("❌ Actual Bot Error:", err);
      await message.reply(`❌ Error: ${err.message}`);
    } finally {
      if (processingMessage.deletable) await processingMessage.delete().catch(() => null);
    }
  }
});

if (process.env.DISCORD_TOKEN) {
  client.login(process.env.DISCORD_TOKEN).catch(err => console.error('❌ Discord Login Error:', err.message));
} else {
  console.log('⚠️ DISCORD_TOKEN missing. Bot setup skipped.');
}

module.exports = client;