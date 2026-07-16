const { Client, GatewayIntentBits } = require('discord.js');
const { handleTask } = require('./agent/orchestrator');
require('dotenv').config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ]
});

client.once('ready', () => {
  console.log(`🤖 Discord Bot logged in as ${client.user.tag}`);
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  if (message.content.startsWith('!agent ')) {
    const task = message.content.slice(7);
    await message.channel.send('⚙️ OpenClaw Agent is processing your request...');
    try {
      const response = await handleTask(task);
      await message.reply(response);
    } catch (err) {
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