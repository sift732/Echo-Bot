const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } = require('discord.js');
const fs = require('fs');
const path = require('path');
const verifyPath = path.resolve(__dirname, 'verify.json');
require('dotenv').config();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('verify_delete')
        .setDescription('認証設定を削除します'),

    async execute(interaction) {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor('#ff0000')
                        .setAuthor({
                            name: 'エラー',
                        })
                        .setDescription('このコマンドはサーバー管理者が実行可能です。')
                        .setTimestamp()
                ],
                ephemeral: true
            });
        }

        const serverId = interaction.guild.id;
        const channelId = interaction.channelId;
        let verifyData;
        try {
            verifyData = JSON.parse(fs.readFileSync(verifyPath, 'utf8'));
        } catch (error) {
            verifyData = {};
        }

        if (!verifyData[serverId] || !verifyData[serverId].some(data => data.channelId === channelId)) {
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor('#ff0000')
                        .setAuthor({
                            name: 'エラー',
                        })
                        .setDescription('ロールIDとチャンネルIDが見つかりません')
                        .setTimestamp()
                ],
                ephemeral: true
            });
        }
        verifyData[serverId] = verifyData[serverId].filter(data => data.channelId !== channelId);

        if (verifyData[serverId].length === 0) {
            delete verifyData[serverId];
        }
        fs.writeFileSync(verifyPath, JSON.stringify(verifyData, null, 2));
        await interaction.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor('#00ff00')
                    .setAuthor({
                        name: '削除完了',
                    })
                    .setDescription('認証設定が削除されました。')
                    .setTimestamp()
            ],
            ephemeral: true
        });
    }
};