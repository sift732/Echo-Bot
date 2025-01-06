const { EmbedBuilder } = require('discord.js');
const sqlite3 = require('sqlite3').verbose();
const dbLeave = new sqlite3.Database('db/leave.db');

module.exports = {
    async execute(member) {
        try {
            const guild = member.guild;
            const guildId = guild.id;
            const userName = member.user.username;
            dbLeave.get(
                'SELECT channel_id, status FROM leave WHERE server_id = ?',
                [guildId],
                async (err, row) => {
                    if (err) {
                        console.error('データベース取得エラー:', err);
                        return;
                    }
                    if (!row || !row.channel_id || row.status === 'disabled') {
                        console.log(`サーバーID ${guildId} の離脱通知は無効または設定がありません。`);
                        return;
                    }

                    const channelId = row.channel_id;
                    const goodbyeEmbed = new EmbedBuilder()
                        .setColor('#ff0000')
                        .setTitle('サーバー離脱通知')
                        .setDescription(`${userName}がサーバーを離脱しました。`)
                        .setTimestamp();

                    try {
                        const channel = await guild.channels.fetch(channelId);
                        if (channel && channel.isTextBased()) {
                            await channel.send({ embeds: [goodbyeEmbed] });
                        } else {
                            console.error(`チャンネルID ${channelId} は有効なテキストチャンネルではありません。`);
                        }
                    } catch (fetchError) {
                        console.error(`チャンネルID ${channelId} の取得中にエラーが発生しました:`, fetchError);
                    }
                }
            );
        } catch (error) {
            console.error('エラー:', error);
        }
    }
};
