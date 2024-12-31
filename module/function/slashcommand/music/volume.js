const { SlashCommandBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('@discordjs/builders');
const { EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('music_volume')
        .setDescription('音楽の音量を設定します')
        .addIntegerOption(option =>
            option.setName('音量')
                .setDescription('設定する音量 (0～200)')
                .setRequired(true)
        ),

    async execute(interaction) {
        const volume = interaction.options.getInteger('音量');
        const guildId = interaction.guildId;
        const manager = interaction.client.manager;
        const player = manager.players.get(guildId);

        if (!player) {
            const embed = new EmbedBuilder()
                .setColor('#ff0000')
                .setAuthor({ name: 'エラー' })
                .setDescription('プレイヤーが存在しません。音楽再生中に音量を変更してください。');
            return interaction.reply({ embeds: [embed], ephemeral: true });
        }

        if (volume < 0 || volume > 200) {
            const embed = new EmbedBuilder()
                .setColor('#ff0000')
                .setAuthor({ name: 'エラー' })
                .setDescription('音量は 0～200 の範囲で指定してください。');
            return interaction.reply({ embeds: [embed], ephemeral: true });
        }

        if (volume > 150) {
            const embed = new EmbedBuilder()
                .setColor('#ffff00')
                .setAuthor({ name: '警告' })
                .setDescription(`音量を ${volume}% に設定しようとしています。この設定は大音量となる可能性があります。設定を続行しますか？`);

            const confirmButton = new ButtonBuilder()
                .setCustomId('confirm_volume')
                .setLabel('はい')
                .setStyle(1);

            const cancelButton = new ButtonBuilder()
                .setCustomId('cancel_volume')
                .setLabel('いいえ')
                .setStyle(4);

            const actionRow = new ActionRowBuilder()
                .addComponents(confirmButton, cancelButton);

            const message = await interaction.reply({ embeds: [embed], components: [actionRow], ephemeral: true });

            const collector = message.createMessageComponentCollector({ time: 15000 });

            collector.on('collect', async i => {
                if (i.customId === 'confirm_volume') {
                    player.setVolume(volume);

                    await i.update({
                        embeds: [
                            new EmbedBuilder()
                                .setColor('#00ff00')
                                .setAuthor({ name: '音量設定' })
                                .setDescription(`音量を ${volume}% に設定しました。`)
                        ],
                        components: []
                    });
                } else if (i.customId === 'cancel_volume') {
                    const defaultVolume = 50;
                    player.setVolume(defaultVolume);

                    await i.update({
                        embeds: [
                            new EmbedBuilder()
                                .setColor('#00ff00')
                                .setAuthor({ name: 'キャンセル' })
                                .setDescription('音量設定をキャンセルしました。音量はデフォルト値 (50%) にリセットされました。')
                        ],
                        components: []
                    });
                }
            });

            collector.on('end', collected => {
                if (collected.size === 0) {
                    interaction.editReply({
                        embeds: [
                            new EmbedBuilder()
                                .setColor('#ff0000')
                                .setAuthor({ name: 'タイムアウト' })
                                .setDescription('音量設定の確認がタイムアウトしました。')
                        ],
                        components: []
                    });
                }
            });

            return;
        }
        player.setVolume(volume);

        const embed = new EmbedBuilder()
            .setColor('#00ff00')
            .setAuthor({ name: '音量設定' })
            .setDescription(`音量を ${volume}% に設定しました。`);
        return interaction.reply({ embeds: [embed], ephemeral: true });
    },
};