const setCommands = require('./set');
const lavalinkConnect = require('./lavalink');

module.exports = async (client) => {
    console.log(`${client.user.tag}がログインしました`);
    await setCommands(client);
    await lavalinkConnect(client);

    console.log('ready.jsが正常に動作しました');
};