const readyEvent = require('./event/ready');
const execute = require('./event/exec');
const { Events } = require('discord.js');

module.exports = (client, handleInteraction) => {
    client.once('ready', () => {
        readyEvent(client);
    });
    client.on(Events.InteractionCreate, async interaction => {
        await handleInteraction(interaction);
        if (interaction.isButton() && interaction.customId === 'verify_button') {
            await handleInteraction(interaction);
        }
    });
    execute(client);
};
