const { ChannelType, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const sqlite3 = require('sqlite3').verbose();
const dbJoin = new sqlite3.Database('db/join.db');
const dbLeave = new sqlite3.Database('db/leave.db');

module.exports = async (guild, client) => {
    try {
        const serverId = guild.id;
        const serverName = guild.name;
        const textChannel = guild.channels.cache.find((channel) => 
            channel.type === ChannelType.GuildText &&
            guild.members.me.permissionsIn(channel).has(PermissionFlagsBits.ViewChannel) &&
            guild.members.me.permissionsIn(channel).has(PermissionFlagsBits.SendMessages)
        );

        if (!textChannel) {
            console.log(`Botがメッセージを送信できるテキストチャンネルが見つかりません。`);
            return;
        }

        const status = 'disabled';
        dbJoin.run('INSERT OR REPLACE INTO join_table (server_id, channel_id, message, status) VALUES (?, ?, ?, ?)', [serverId, null, null, status], (err) => {
            if (err) {
                console.error('join.db への追加エラー:', err);
                return;
            }
            console.log(`サーバーID ${serverId} の join_table に設定を追加しました。`);
        });

        dbLeave.run('INSERT OR REPLACE INTO leave (server_id, channel_id, status) VALUES (?, ?, ?)', [serverId, null, status], (err) => {
            if (err) {
                console.error('leave.db への追加エラー:', err);
                return;
            }
            console.log(`サーバーID ${serverId} の leave テーブルに設定を追加しました。`);
        });

        dbJoin.get('SELECT COUNT(*) AS count FROM join_table', (err, row) => {
            if (err) {
                console.error('サーバー数の取得エラー:', err);
                return;
            }
            const totalServers = client.guilds.cache.size;
            const embed = new EmbedBuilder()
                .setColor('#00ff00')
                .setTitle('BOTを導入してくれてありがとう！')
                .addFields(
                    { name: `${serverName}に導入してくれてありがとうございます`, value: `このサーバーが**${totalServers}**サーバー目に導入してくれました`, inline: false },
                    { name: 'コマンドの説明', value: '**/global_join** でグローバルチャットを利用\n**/database_join** でようこそメッセージを設定\n**/database_leave** で離脱メッセージを設定\n**/verify_set** で認証を設定\n', inline: false }
                )
                .setTimestamp();
            const rowButtons = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setLabel('サポートサーバー')
                        .setStyle(ButtonStyle.Link)
                        .setURL(process.env.SUPPORT),
                    new ButtonBuilder()
                        .setLabel('認証')
                        .setStyle(ButtonStyle.Link)
                        .setURL('https://echo-bot-page.glitch.me/index.html?page=auth')
                );
            textChannel.send({ embeds: [embed], components: [rowButtons] });
            console.log(`サーバーID ${serverId} のチャンネルに導入メッセージを送信しました。`);
        });

    } catch (error) {
        console.error('サーバー追加処理中にエラーが発生しました:', error);
    }
};
