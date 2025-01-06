const setCommands = require('./set');
const lavalinkConnect = require('./lavalink');
const setPresence = require('./Presence');
const scheduleRanking = require('./auto/ranking');

module.exports = async (client) => {
    console.log(`${client.user.tag}がログインしました`);
    await setCommands(client);
    await lavalinkConnect(client);
    await setPresence(client);
    scheduleRanking(client);

    console.log('ready.jsが正常に動作しました');
};