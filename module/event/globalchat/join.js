const { EmbedBuilder, WebhookClient } = require('discord.js');
const sqlite3 = require('sqlite3').verbose();
const dbGlobal = new sqlite3.Database('db/setting.db');

module.exports = {
    name: 'global_join',
    async execute(guildId, channelId) {
        try {
            dbGlobal.all('SELECT guild_id, channel_id, webhook_url FROM settings', async (err, rows) => {
                if (err) {
                    console.error('データベースの取得エラー:', err);
                    return;
                }

                if (rows.length === 0) {
                    console.log('登録されているグローバルチャット設定がありません。');
                    return;
                }

                const embed = new EmbedBuilder()
                    .setColor('#00ff00')
                    .setTitle('グローバルチャット新規参加')
                    .setDescription(`サーバー (${guildId}) がグローバルチャットに参加しました。`)
                    .setFooter({
                        text: `グローバルチャット登録数: ${rows.length}`,
                    })
                    .setTimestamp();

                for (const row of rows) {
                    if (row.guild_id === guildId && row.channel_id === channelId) {
                        console.log(`実行元のチャンネル除外`);
                        continue;
                    }

                    try {
                        const webhookClient = new WebhookClient({ url: row.webhook_url });
                        await webhookClient.send({ embeds: [embed] });
                        console.log(`グローバルチャットに参加メッセージが送信されました (${guildId})`);
                    } catch (err) {
                        console.error('Webhook送信エラー:', err);
                    }
                }
            });
        } catch (error) {
            console.error('エラー:', error);
        }
    }
};
