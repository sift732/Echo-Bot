const { Client, GatewayIntentBits } = require('discord.js');
const dotenv = require('dotenv');
const registerEvents = require('./module/event');

dotenv.config();

const client = new Client({
    intents: Object.values(GatewayIntentBits),
});

registerEvents(client);

client.login(process.env.TOKEN);