const { EmbedBuilder } = require('discord.js');
const sqlite3 = require('sqlite3').verbose();
const dbJoin = new sqlite3.Database('db/join.db');

module.exports = {
    async execute(member) {
        try {
            const guildId = member.guild.id;
            if (!guildId) {
                console.error('サーバー情報が正しく提供されていません。');
                return;
            }
            dbJoin.all(
                'SELECT channel_id, message, status FROM join_table WHERE server_id = ? AND status = ?',
                [guildId, 'enabled'],
                async (err, rows) => {
                    if (err) {
                        console.error('データベース取得エラー:', err);
                        return;
                    }

                    if (rows.length === 0) {
                        console.log(`サーバーID ${guildId} に設定された有効なメッセージがありません。`);
                        return;
                    }
                    for (let row of rows) {
                        const channelId = row.channel_id;
                        const message = row.message;
                        const welcomeEmbed = new EmbedBuilder()
                            .setColor('#00ff00')
                            .setTitle('新規参加者')
                            .setDescription(message.replace('{user}', `${member.user.tag}`))
                            .addFields(
                                { name: '参加者', value: `${member.user.tag}`, inline: true },
                            )
                            .setThumbnail(member.user.displayAvatarURL())
                            .setTimestamp();

                        try {
                            const channel = await member.guild.channels.fetch(channelId);
                            if (channel && channel.isTextBased()) {
                                await channel.send({ embeds: [welcomeEmbed] });
                            } else {
                                console.error(`チャンネルID${channelId}はテキストベースではありません。`);
                            }
                        } catch (fetchError) {
                            console.error(`チャンネルID ${channelId} の取得中にエラーが発生しました:`, fetchError);
                        }
                    }
                }
            );
        } catch (error) {
            console.error('エラー:', error);
        }
    },
};
