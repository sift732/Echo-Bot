const {ActionRowBuilder,ButtonBuilder,ButtonStyle} = require('discord.js');

module.exports = {
    handleButtonInteraction: async (interaction) => {
        const customId = interaction.customId;

        switch (customId) {
            case 'report_discard': {
                await interaction.update({ content: 'レポートを破棄しました。', components: [] });
                break;
            }

            case 'report_warn': {
                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('warn_user')
                        .setLabel('ユーザーを警告')
                        .setStyle(ButtonStyle.Primary),
                    new ButtonBuilder()
                        .setCustomId('warn_server')
                        .setLabel('サーバーを警告')
                        .setStyle(ButtonStyle.Danger)
                );

                await interaction.reply({
                    content: '報告対象を選択してください。',
                    components: [row],
                    ephemeral: true,
                });
                break;
            }

            case 'report_mute': {
                await handleMuteModalSubmit(interaction);
                break;
            }

            default: {
                await interaction.reply({ content: '不明なボタンがクリックされました。', ephemeral: true });
                break;
            }
        }
    },
};
