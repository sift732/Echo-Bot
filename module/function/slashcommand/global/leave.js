const { SlashCommandBuilder } = require('@discordjs/builders');
const { EmbedBuilder, WebhookClient } = require('discord.js');
const sqlite3 = require('sqlite3').verbose();
const dbGlobal = new sqlite3.Database('db/setting.db');
const { execute: leaveExecute } = require('../../../event/globalchat/leave');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('global_leave')
        .setDescription('グローバルチャットから離脱します'),

    async execute(interaction) {
        try {
            if (!interaction.member.permissions.has('ADMINISTRATOR') &&
                !interaction.member.permissions.has('MANAGE_WEBHOOKS') &&
                !interaction.member.permissions.has('MANAGE_CHANNELS')) {
                
                const noPermissionEmbed = new EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle('権限エラー')
                    .setDescription('このコマンドを実行するには管理者権限、またはWebhookの管理とチャンネルの管理権限が必要です。')
                    .setTimestamp();

                return interaction.reply({ embeds: [noPermissionEmbed], ephemeral: true });
            }

            const guildId = interaction.guild.id;
            const channelId = interaction.channel.id;
            dbGlobal.get('SELECT webhook_url FROM settings WHERE guild_id = ? AND channel_id = ?', [guildId, channelId], async (err, row) => {
                if (err) {
                    console.error('データベースの取得エラー:', err);
                    return;
                }

                if (!row) {
                    const errorEmbed = new EmbedBuilder()
                        .setColor('#ff0000')
                        .setTitle('エラー')
                        .setDescription('このサーバーはグローバルチャットに参加していません。')
                        .setTimestamp();
                    return interaction.reply({ embeds: [errorEmbed], ephemeral: true });
                }

                const webhookClient = new WebhookClient({ url: row.webhook_url });

                try {
                    await webhookClient.delete();
                    console.log('Webhookが削除されました');
                } catch (err) {
                    console.error('Webhook削除エラー:', err);
                }
                
                dbGlobal.run('DELETE FROM settings WHERE guild_id = ? AND channel_id = ?', [guildId, channelId], (err) => {
                    if (err) {
                        console.error('データベースの削除エラー:', err);
                        const errorEmbed = new EmbedBuilder()
                            .setColor('#ff0000')
                            .setTitle('エラー')
                            .setDescription('設定の削除中にエラーが発生しました。')
                            .setTimestamp();
                        return interaction.reply({ embeds: [errorEmbed], ephemeral: true });
                    }

                    if (interaction.member.permissions.has('ADMINISTRATOR')) {
                        interaction.channel.setRateLimitPerUser(0, 'グローバルチャットから退会したため低速モードを解除').catch(error => {
                            console.error('低速モード解除エラー:', error);
                        });
                    }
                    leaveExecute(guildId, channelId);

                    const successEmbed = new EmbedBuilder()
                        .setColor('#00ff00')
                        .setTitle('グローバルチャット退会完了')
                        .setDescription('このサーバーはグローバルチャットから退会しました。')
                        .addFields(
                            { name: 'サーバーID', value: guildId, inline: true },
                            { name: 'チャンネルID', value: channelId, inline: true }
                        )
                        .setTimestamp();

                    return interaction.reply({ embeds: [successEmbed] });
                });
            });
        } catch (error) {
            console.error('エラー:', error);
            const errorEmbed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('エラー')
                .setDescription('グローバルチャットの退会中にエラーが発生しました。')
                .setTimestamp();

            await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }
    },
};