const { SlashCommandBuilder } = require('@discordjs/builders');
const { EmbedBuilder } = require('discord.js');
const sqlite3 = require('sqlite3').verbose();
const dbLeave = new sqlite3.Database('db/leave.db');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('database_leave')
        .setDescription('サーバー離脱時に送信するチャンネルを設定します')
        .addStringOption(option => 
            option.setName('チャンネルid')
                .setDescription('送信先のチャンネルID')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('状態')
                .setDescription('有効か無効かを選択')
                .setRequired(true)
                .addChoices(
                    { name: '有効', value: 'enabled' },
                    { name: '無効', value: 'disabled' }
                )),

    async execute(interaction) {
        if (!interaction.member.permissions.has('Administrator')) {
            const errorEmbed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('権限エラー')
                .setDescription('このコマンドは管理者のみが実行できます。')
                .setTimestamp();

            return interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }

        const channelId = interaction.options.getString('チャンネルid');
        const status = interaction.options.getString('状態');

        try {
            const serverId = interaction.guild.id;
            dbLeave.run('REPLACE INTO leave (server_id, channel_id, status) VALUES (?, ?, ?)', [serverId, channelId, status], (err) => {
                if (err) {
                    console.error('データベースエラー:', err);
                    const errorEmbed = new EmbedBuilder()
                        .setColor('#ff0000')
                        .setTitle('エラー')
                        .setDescription('チャンネルの設定中にエラーが発生しました。')
                        .setTimestamp();

                    return interaction.reply({ embeds: [errorEmbed], ephemeral: true });
                }

                const successEmbed = new EmbedBuilder()
                    .setColor('#00ff00')
                    .setTitle('設定完了')
                    .setDescription('サーバー離脱時に送信するチャンネルが設定されました。')
                    .addFields(
                        { name: 'チャンネルID', value: channelId, inline: true },
                        { name: '状態', value: status === 'enabled' ? '有効' : '無効', inline: true }
                    )
                    .setTimestamp();

                return interaction.reply({ embeds: [successEmbed] });
            });
        } catch (error) {
            console.error('エラー:', error);
            const errorEmbed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('エラー')
                .setDescription('エラーが発生しました。')
                .setTimestamp();

            await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }
    }
};
