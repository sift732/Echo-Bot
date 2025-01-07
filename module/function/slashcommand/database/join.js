const { SlashCommandBuilder } = require('@discordjs/builders');
const { EmbedBuilder } = require('discord.js');
const sqlite3 = require('sqlite3').verbose();
const dbJoin = new sqlite3.Database('db/join.db');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('database_join')
        .setDescription('サーバー参加時のメッセージを設定する')
        .addStringOption(option => 
            option.setName('状態')
                .setDescription('状態を選択してください')
                .setRequired(true)
                .addChoices(
                    { name: '有効', value: 'enabled' },
                    { name: '無効', value: 'disabled' },
                    { name: '更新', value: 'update' }
                )
        )
        .addStringOption(option => option.setName('チャンネルid').setDescription('チャンネルID').setRequired(false))
        .addStringOption(option => option.setName('メッセージ').setDescription('送信するメッセージ').setRequired(false)),

    async execute(interaction) {
        try {
            if (!interaction.member.permissions.has('Administrator')) {
                const errorEmbed = new EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle('エラー')
                    .setDescription('このコマンドは管理者権限のユーザーのみ実行可能です。');
                return interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            }

            const status = interaction.options.getString('状態');
            const channelId = interaction.options.getString('チャンネルid');
            const message = interaction.options.getString('メッセージ');
            const serverId = interaction.guild.id;

            if (status === 'enabled') {
                if (!channelId || !message) {
                    const errorEmbed = new EmbedBuilder()
                        .setColor('#ff0000')
                        .setTitle('エラー')
                        .setDescription('状態が 有効 の場合、チャンネルIDとメッセージを指定する必要があります。');
                    return interaction.reply({ embeds: [errorEmbed], ephemeral: true });
                }
                dbJoin.run(
                    'INSERT INTO join_table (status, server_id, channel_id, message) VALUES (?, ?, ?, ?)',
                    ['enabled', serverId, channelId, message],
                    (insertErr) => {
                        if (insertErr) {
                            console.error('データベース更新エラー:', insertErr);

                            const dbErrorEmbed = new EmbedBuilder()
                                .setColor('#ff0000')
                                .setTitle('エラー')
                                .setDescription('設定の保存中にエラーが発生しました。詳細はログを確認してください。');
                            return interaction.reply({ embeds: [dbErrorEmbed], ephemeral: true });
                        }

                        const successEmbed = new EmbedBuilder()
                            .setColor('#00ff00')
                            .setTitle('設定完了')
                            .setDescription(`サーバー参加時のメッセージが新たに設定されました。\n\n**チャンネルID:** ${channelId}\n**メッセージ:** ${message}`);
                        return interaction.reply({ embeds: [successEmbed], ephemeral: true });
                    }
                );
            } else if (status === 'disabled') {
                dbJoin.run(
                    'UPDATE join_table SET status = ? WHERE server_id = ?',
                    ['disabled', serverId],
                    (updateErr) => {
                        if (updateErr) {
                            console.error('データベース更新エラー:', updateErr);

                            const dbErrorEmbed = new EmbedBuilder()
                                .setColor('#ff0000')
                                .setTitle('エラー')
                                .setDescription('無効化の設定中にエラーが発生しました');
                            return interaction.reply({ embeds: [dbErrorEmbed], ephemeral: true });
                        }

                        const successEmbed = new EmbedBuilder()
                            .setColor('#00ff00')
                            .setTitle('無効化完了')
                            .setDescription(`サーバー参加時のメッセージが無効化されました。`);
                        return interaction.reply({ embeds: [successEmbed], ephemeral: true });
                    }
                );
            } else if (status === 'update') {
                if (!channelId || !message) {
                    const errorEmbed = new EmbedBuilder()
                        .setColor('#ff0000')
                        .setTitle('エラー')
                        .setDescription('状態が 更新 の場合、チャンネルIDとメッセージを指定する必要があります。');
                    return interaction.reply({ embeds: [errorEmbed], ephemeral: true });
                }

                dbJoin.get(
                    'SELECT * FROM join_table WHERE server_id = ? AND channel_id = ?',
                    [serverId, channelId],
                    (err, row) => {
                        if (err) {
                            console.error('データベースクエリエラー:', err);

                            const errorEmbed = new EmbedBuilder()
                                .setColor('#ff0000')
                                .setTitle('エラー')
                                .setDescription('エラーが発生しました。詳細はログを確認してください。');
                            return interaction.reply({ embeds: [errorEmbed], ephemeral: true });
                        }

                        if (!row) {
                            const existsEmbed = new EmbedBuilder()
                                .setColor('#ff0000')
                                .setTitle('更新失敗')
                                .setDescription('指定されたチャンネルIDには設定が存在しません。');
                            return interaction.reply({ embeds: [existsEmbed], ephemeral: true });
                        }
                        dbJoin.run(
                            'UPDATE join_table SET message = ? WHERE server_id = ? AND channel_id = ?',
                            [message, serverId, channelId],
                            (updateErr) => {
                                if (updateErr) {
                                    console.error('データベース更新エラー:', updateErr);

                                    const dbErrorEmbed = new EmbedBuilder()
                                        .setColor('#ff0000')
                                        .setTitle('エラー')
                                        .setDescription('設定の更新中にエラーが発生しました。詳細はログを確認してください。');
                                    return interaction.reply({ embeds: [dbErrorEmbed], ephemeral: true });
                                }

                                const successEmbed = new EmbedBuilder()
                                    .setColor('#00ff00')
                                    .setTitle('設定更新完了')
                                    .setDescription(`サーバー参加時のメッセージが更新されました。\n\n**チャンネルID:** ${channelId}\n**新しいメッセージ:** ${message}`);
                                return interaction.reply({ embeds: [successEmbed], ephemeral: true });
                            }
                        );
                    }
                );
            }
        } catch (error) {
            console.error('エラー:', error);

            const catchErrorEmbed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('エラー')
                .setDescription('予期しないエラーが発生しました');
            return interaction.reply({ embeds: [catchErrorEmbed], ephemeral: true });
        }
    },
};
