const { ShardingManager } = require('discord.js');
require('dotenv').config();

const manager = new ShardingManager('./index.js', {
    totalShards: 4,
    shardList: [0, 1],
    token: process.env.TOKEN,
});

manager.on('shardCreate', shard => {
    console.log(`[シャード ${shard.id} を作成しました]`);
});

manager.spawn();