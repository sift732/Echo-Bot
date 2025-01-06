const { SlashCommandBuilder } = require('@discordjs/builders');
const { EmbedBuilder, WebhookClient } = require('discord.js');
const sqlite3 = require('sqlite3').verbose();
const { execute: joinExecute } = require('../../../event/globalchat/join');

const dbGlobal = new sqlite3.Database('db/setting.db');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('global_join')
        .setDescription('グローバルチャットに参加します'),

    async execute(interaction) {
        try {
            const guildId = interaction.guild.id;
            const channelId = interaction.channel.id;
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
            
            dbGlobal.get('SELECT * FROM settings WHERE guild_id = ? AND channel_id = ?', [guildId, channelId], async (err, row) => {
                if (err) {
                    console.error('データベースの確認エラー:', err);
                    return;
                }

                if (row) {
                    const alreadyJoinedEmbed = new EmbedBuilder()
                        .setColor('#ff0000')
                        .setTitle('すでにグローバルチャットに参加しています')
                        .setDescription(`このサーバーはすでに別のチャンネルでグローバルチャットに参加しています\nグローバルチャット情報を削除し別のチャンネルで続行する場合は以下のチャンネルで /global_leave コマンドを実行してください`)
                        .addFields(
                            { name: 'サーバーID', value: guildId, inline: true },
                            { name: 'チャンネル', value: `<#${channelId}>`, inline: true }
                        )
                        .setTimestamp();

                    return interaction.reply({ embeds: [alreadyJoinedEmbed], ephemeral: true });
                }
                
                const webhook = await interaction.channel.createWebhook({
                    name: 'ECHO-BOT-GLOBAL',
                    reason: 'ECHO-BOT-GLOBALCHATに使用',
                });

                const webhookUrl = webhook.url;
                dbGlobal.run(
                    `CREATE TABLE IF NOT EXISTS settings (
                        guild_id TEXT PRIMARY KEY,
                        channel_id TEXT NOT NULL,
                        webhook_url TEXT NOT NULL
                    )`
                );
                dbGlobal.run(
                    `INSERT OR REPLACE INTO settings (guild_id, channel_id, webhook_url) VALUES (?, ?, ?)`,
                    [guildId, channelId, webhookUrl],
                    (err) => {
                        if (err) {
                            console.error('データベースへの保存エラー:', err);
                            const errorEmbed = new EmbedBuilder()
                                .setColor('#ff0000')
                                .setTitle('エラー')
                                .setDescription('設定の保存中にエラーが発生しました。')
                                .setTimestamp();
                            return interaction.reply({ embeds: [errorEmbed], ephemeral: true });
                        }
                        const successEmbed = new EmbedBuilder()
                            .setColor('#0099ff')
                            .setTitle('グローバルチャット参加完了')
                            .setDescription('このサーバーをグローバルチャットに参加させました。')
                            .addFields(
                                { name: 'サーバーID', value: guildId, inline: true },
                                { name: 'チャンネル', value: `<#${channelId}>`, inline: true },
                                { name: 'Webhook URL', value: webhookUrl, inline: false }
                            )
                            .setTimestamp();

                        interaction.reply({ embeds: [successEmbed], ephemeral: true });
                        interaction.channel.setRateLimitPerUser(5, 'グローバルチャット参加により低速モードを設定').catch(error => {
                            console.error('低速モードの設定エラー:', error);
                        });

                        joinExecute(guildId, channelId);
                    }
                );
            });
        } catch (error) {
            console.error('エラー:', error);
            const errorEmbed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('エラー')
                .setDescription('Webhookの作成中にエラーが発生しました。')
                .setTimestamp();

            await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }
    },
};
