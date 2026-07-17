const { Client, GatewayIntentBits, Partials } = require('discord.js');
const { handleTask } = require('./agent/orchestrator');
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

  // Dono tareeqon ko support karega (Chahe !agent likhein ya na likhein)
  let task = message.content.trim();
  let isAgentCommand = false;

  if (task.startsWith('!agent ')) {
    task = task.slice(7);
    isAgentCommand = true;
  }

  // Agar simple hi/hello hai toh direct reply
  if (task.toLowerCase() === 'hi' || task.toLowerCase() === 'hello') {
    return message.reply('Hello Bhai! Main bilkul active hoon aur sun raha hoon. Aap mujhse koi bhi sawal pooch sakte hain!');
  }

  // AI Agent Processing
  if (isAgentCommand || message.channel.type === 1) { // !agent command ho ya DM ho
    await message.channel.send('⚙️ OpenClaw Agent is processing your request...');
    
    try {
      console.log(`🧠 AI Agent is processing task: "${task}"`);
      const response = await handleTask(task);
      await message.reply(response);
    } catch (err) {
      console.error("❌ Actual Bot Error:", err);
      await message.reply(`❌ Error: ${err.message}`);
    }
  }
});

if (process.env.DISCORD_TOKEN) {
  client.login(process.env.DISCORD_TOKEN).catch(err => console.error('❌ Discord Login Error:', err.message));
} else {
  console.log('⚠️ DISCORD_TOKEN missing. Bot setup skipped.');
}

module.exports = client;