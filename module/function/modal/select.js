const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    handleWarnModalSubmit: async (interaction) => {
        if (interaction.customId === 'warn_modal') {
            const targetId = interaction.fields.getTextInputValue('warn_target_id');
            const warnContent = interaction.fields.getTextInputValue('warn_content');

            try {
                const targetUser = await interaction.client.users.fetch(targetId);

                if (targetUser) {
                    const embed = new EmbedBuilder()
                        .setColor('#FF0000')
                        .setTitle('警告')
                        .setDescription(warnContent)
                        .setFooter({
                            text: `${interaction.user.username} (${interaction.user.id})`,
                            iconURL: interaction.user.displayAvatarURL(),
                        })
                        .setTimestamp();
                    await targetUser.send({
                        embeds: [embed]
                    });

                    const successEmbed = new EmbedBuilder()
                        .setColor('#00FF00')
                        .setTitle('成功')
                        .setDescription(`ID ${targetId} に警告を送信しました。`)
                        .setTimestamp();

                    await interaction.reply({
                        embeds: [successEmbed],
                        ephemeral: true,
                    });
                } else {
                    const notFoundEmbed = new EmbedBuilder()
                        .setColor('#FF0000')
                        .setTitle('エラー')
                        .setDescription(`指定されたユーザーID ${targetId} が見つかりません。`)
                        .setTimestamp();

                    await interaction.reply({
                        embeds: [notFoundEmbed],
                        ephemeral: true,
                    });
                }
            } catch (error) {
                console.error('警告処理エラー:', error);
                const errorEmbed = new EmbedBuilder()
                    .setColor('#FF0000')
                    .setTitle('エラー')
                    .setDescription('警告処理中にエラーが発生しました。')
                    .setTimestamp();

                await interaction.reply({
                    embeds: [errorEmbed],
                    ephemeral: true,
                });
            }
        }
    },

    handleWarnButton: async (interaction) => {
        const customId = interaction.customId;

        if (customId === 'warn_user' || customId === 'warn_server') {
            const modal = new ModalBuilder()
                .setCustomId('warn_modal')
                .setTitle(customId === 'warn_user' ? 'ユーザー警告' : 'サーバー警告');

            const idInput = new TextInputBuilder()
                .setCustomId('warn_target_id')
                .setLabel(customId === 'warn_user' ? 'ユーザーID' : 'サーバーID')
                .setStyle(TextInputStyle.Short)
                .setRequired(true);

            const warnContentInput = new TextInputBuilder()
                .setCustomId('warn_content')
                .setLabel('警告内容')
                .setStyle(TextInputStyle.Paragraph)
                .setRequired(true);

            const row1 = new ActionRowBuilder().addComponents(idInput);
            const row2 = new ActionRowBuilder().addComponents(warnContentInput);

            modal.addComponents(row1, row2);

            await interaction.showModal(modal);
        }
    },
};
