const { Manager } = require('magmastream');
const dotenv = require('dotenv');
dotenv.config();

module.exports = async (client) => {
    const lavalinkHost = process.env.LAVALINK_HOST;
    const lavalinkPort = parseInt(process.env.LAVALINK_PORT, 10);
    const lavalinkPassword = process.env.LAVALINK_PASSWORD;

    if (isNaN(lavalinkPort)) {
        console.error('ポート指定が不正です');
        return;
    }

    const lavalink = new Manager({
        clientId: client.user.id,
        nodes: [
            {
                host: lavalinkHost,
                port: lavalinkPort,
                password: lavalinkPassword,
            },
        ],
        send: (id, payload) => {
            const guild = client.guilds.cache.get(id);
            if (guild) {
                guild.shard.send(payload);
            }
        },
    });

    client.on('raw', (d) => client.manager.updateVoiceState(d));

    lavalink.on('nodeConnect', (node) => {
        console.log(`Lavalinkに接続しました：${node.options.host}:${node.options.port}`);
    });

    lavalink.on('nodeReconnect', (node)=> {
        console.log('Lavalinkに再接続しました：${node.options.host}:${node.options.port}');
    });

    lavalink.on('nodeError', (node, error) => {
        console.error(`${node.options.host}:${node.options.port}に接続失敗しました/エラー内容：`, error);
    });

    lavalink.on('nodeDisconnect', () => {
        console.warn('Lavalinkからの接続が切断されました');
    })

    lavalink.on('trackStart', (player, track) => {
        console.log(`再生を開始：${track.title}`);
    });

    lavalink.on('trackEnd', (player, track) => {
        console.log(`再生を終了：${track.title}`);
    });

    try {
        await lavalink.init();
        client.manager = lavalink;
    } catch (error) {
        console.error('Lavalink接続中にエラーが発生しました：', error);
    }
};