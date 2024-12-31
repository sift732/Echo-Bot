const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const crypto = require('crypto');
require('dotenv').config();
const { addReportToDb } = require('../../event/sqlite');

module.exports = {
    openReportModal: async (interaction) => {
        const modal = new ModalBuilder()
            .setCustomId('user_report_modal')
            .setTitle('レポート');

        const serverIdInput = new TextInputBuilder()
            .setCustomId('server_id')
            .setLabel('サーバーIDまたはユーザーID')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        const titleInput = new TextInputBuilder()
            .setCustomId('title')
            .setLabel('タイトル')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        const contentInput = new TextInputBuilder()
            .setCustomId('content')
            .setLabel('内容')
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true);

        const row1 = new ActionRowBuilder().addComponents(serverIdInput);
        const row2 = new ActionRowBuilder().addComponents(titleInput);
        const row3 = new ActionRowBuilder().addComponents(contentInput);

        modal.addComponents(row1, row2, row3);

        await interaction.showModal(modal);
    },

    handleReportSubmit: async (interaction) => {
        if (interaction.customId === 'user_report_modal') {
            const serverId = interaction.fields.getTextInputValue('server_id');
            const title = interaction.fields.getTextInputValue('title');
            const content = interaction.fields.getTextInputValue('content');

            if (isNaN(serverId) || serverId.trim() === '') {
                const errorEmbed = new EmbedBuilder()
                    .setColor('#FF0000')
                    .setTitle('エラー')
                    .setDescription('サーバーIDまたはユーザーIDには数字を入力してください。')
                    .setTimestamp();

                return interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            }

            let targetServer = null;
            let targetUser = null;

            try {
                targetServer = interaction.client.guilds.cache.get(serverId);
            } catch (err) {
                targetServer = null;
            }

            try {
                targetUser = await interaction.client.users.fetch(serverId);
            } catch (err) {
                targetUser = null;
            }

            if (!targetServer && !targetUser) {
                const notFoundEmbed = new EmbedBuilder()
                    .setColor('#FF0000')
                    .setTitle('エラー')
                    .setDescription('指定されたサーバーIDまたはユーザーIDが見つかりません。')
                    .setTimestamp();

                return interaction.reply({ embeds: [notFoundEmbed], ephemeral: true });
            }
            const reportId = crypto.randomBytes(4).toString('hex');

            const executorId = interaction.user.id;
            const serverIdToSave = interaction.guild.id
            const channelId = interaction.channel.id;

            try {
                await addReportToDb(reportId, executorId, serverIdToSave, channelId, title, content);
            } catch (err) {
                console.error('レポート保存エラー:', err.message);
                const errorEmbed = new EmbedBuilder()
                    .setColor('#FF0000')
                    .setTitle('エラー')
                    .setDescription('レポートの保存中にエラーが発生しました。')
                    .setTimestamp();
                return interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            }

            const embed = new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('レポート')
                .addFields(
                    {
                        name: targetServer ? 'サーバーID' : 'ユーザーID',
                        value: serverId,
                    },
                    { name: 'タイトル', value: title },
                    { name: '内容', value: content },
                    { name: 'レポートID', value: `\`\`${reportId}\`\`` }
                )
                .setTimestamp();

            if (targetServer) {
                embed.setThumbnail(targetServer.iconURL() || 'https://via.placeholder.com/128');
                embed.addFields(
                    { name: 'サーバー名', value: targetServer.name },
                );
            }

            if (targetUser) {
                embed.setThumbnail(targetUser.displayAvatarURL() || 'https://via.placeholder.com/128');
                embed.addFields(
                    { name: 'ユーザー名', value: targetUser.username },
                );
            }

            embed.setFooter({
                text: `${interaction.user.username} (${interaction.user.id})`,
                iconURL: interaction.user.displayAvatarURL(),
            });

            const buttons = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('report_discard')
                    .setLabel('破棄')
                    .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId('report_warn')
                    .setLabel('警告')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('report_mute')
                    .setLabel('ミュート')
                    .setStyle(ButtonStyle.Secondary)
            );

            const reportChannelId = process.env.REPORT_CHANNEL_ID;
            const reportChannel = await interaction.client.channels.fetch(reportChannelId);

            if (!reportChannel) {
                const noChannelEmbed = new EmbedBuilder()
                    .setColor('#FF0000')
                    .setTitle('エラー')
                    .setDescription('レポートチャンネルが見つかりませんでした。')
                    .setTimestamp();

                return interaction.reply({ embeds: [noChannelEmbed], ephemeral: true });
            }

            await reportChannel.send({ embeds: [embed], components: [buttons] });

            const successEmbed = new EmbedBuilder()
                .setColor('#00FF00')
                .setTitle('成功')
                .setDescription(`レポートが送信されました。レポートID: \`\`${reportId}\`\``)
                .setTimestamp();

            await interaction.reply({ embeds: [successEmbed], ephemeral: true });
        }
    }
};
