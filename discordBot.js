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

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  console.log(`📝 Naya message aaya [${message.channel.name || 'DM'}]: "${message.content}" from ${message.author.tag}`);

  // Pure Admin Premium Bypass Verification
  const isAdmin = message.author.username === 'abdulbasit0509';
  if (isAdmin) {
    console.log(`👑 Admin Abdul Basit detected! Premium trial bypass activated.`);
  }

  let task = message.content.trim();
  let isAgentCommand = false;

  if (task.startsWith('!agent ')) {
    task = task.slice(7);
    isAgentCommand = true;
  }

  // Simple Greetings System
  if (task.toLowerCase() === 'hi' || task.toLowerCase() === 'hello') {
    return message.reply('Hello Bhai! Main bilkul active hoon aur sun raha hoon. Aap mujhse koi bhi sawal ya file conversion ka kaam pooch sakte hain!');
  }

  // AI Agent & File Processing Framework
  if (isAgentCommand || message.channel.type === 1 || message.attachments.size > 0) {
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
        await message.reply(agentResponse || "Processing complete with no output content.");
      }

    } catch (err) {
      console.error("❌ Actual Bot Error:", err);
      await message.reply(`❌ Error: ${err.message}`);
    } finally {
      // Clean target processing message stream
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