const readyEvent = require('./event/ready');
const execEvent = require('./event/exec');
const messageEvent = require('./event/globalchat/message');
const guildCreateEvent = require('./event/GuildCreate/add');
const guildDeleteEvent = require('./event/GuildDelete/leave');
const { Events } = require('discord.js');

module.exports = (client) => {
    client.once('ready', () => {
        readyEvent(client);
    });

    client.on(Events.MessageCreate, (message) => {
        messageEvent.execute(message);
    });

    client.on(Events.GuildMemberAdd, async (member) => {
        const joinEvent = require('./event/db/join');
        await joinEvent.execute(member);
    });

    client.on(Events.GuildMemberRemove, async (member) => {
        const leaveEvent = require('./event/db/leave');
        await leaveEvent.execute(member);
    });

    client.on(Events.GuildCreate, (guild) => {
        guildCreateEvent(guild, client);
    });

    client.on(Events.GuildDelete, (guild) => {
        guildDeleteEvent(guild);
    });

    execEvent(client);
};