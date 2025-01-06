const { SlashCommandBuilder } = require('@discordjs/builders');
const { EmbedBuilder } = require('discord.js');
const sqlite3 = require('sqlite3').verbose();
const dbGlobal = new sqlite3.Database('db/setting.db');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('global_list')
        .setDescription('グローバルチャット登録リストを表示します'),

    async execute(interaction) {
        try {
            dbGlobal.all('SELECT guild_id FROM settings', async (err, rows) => {
                if (err) {
                    console.error('データベース取得エラー:', err);
                    const errorEmbed = new EmbedBuilder()
                        .setColor('#ff0000')
                        .setTitle('エラー')
                        .setDescription('データベースの取得中にエラーが発生しました。')
                        .setTimestamp();
                    return interaction.reply({ embeds: [errorEmbed], ephemeral: true });
                }

                if (rows.length === 0) {
                    const noServersEmbed = new EmbedBuilder()
                        .setColor('#ffcc00')
                        .setTitle('グローバルチャット登録リスト')
                        .setDescription('現在、グローバルチャットに登録されているサーバーはありません。')
                        .setTimestamp();
                    return interaction.reply({ embeds: [noServersEmbed] });
                }

                let serverList = [];
                for (const row of rows) {
                    try {
                        const guild = await interaction.client.guilds.fetch(row.guild_id);
                        serverList.push(`${guild.name} (${guild.id})`);
                    } catch (fetchError) {
                        console.error(`サーバー取得エラー: ${row.guild_id}`, fetchError);
                        serverList.push(`不明なサーバー (${row.guild_id})`);
                    }
                }

                const listEmbed = new EmbedBuilder()
                    .setColor('#0099ff')
                    .setTitle('グローバルチャット登録リスト')
                    .setDescription(serverList.join('\n'))
                    .setTimestamp();

                return interaction.reply({ embeds: [listEmbed] });
            });
        } catch (error) {
            console.error('エラー:', error);
            const errorEmbed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('エラー')
                .setDescription('グローバルチャットリストの取得中にエラーが発生しました。')
                .setTimestamp();

            await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }
    },
};
