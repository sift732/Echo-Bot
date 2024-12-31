const { SlashCommandBuilder } = require('@discordjs/builders');
const { EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('music_loop')
        .setDescription('音楽のループ設定を管理します')
        .addStringOption(option =>
            option.setName('状態')
                .setDescription('ループを有効または無効にします')
                .setRequired(false)
                .addChoices(
                    { name: '有効', value: 'enabled' },
                    { name: '無効', value: 'disabled' }
                )
        ),

    async execute(interaction) {
        const guildId = interaction.guildId;
        const player = interaction.client.manager.players.get(guildId);
        if (!player) {
            const embed = new EmbedBuilder()
                .setColor('#ff0000')
                .setAuthor({ name: 'エラー' })
                .setDescription('現在再生中の音楽プレイヤーが存在しません。');
            return interaction.reply({ embeds: [embed] });
        }

        const loopState = interaction.options.getString('状態');

        if (!loopState) {
            const embed = new EmbedBuilder()
                .setColor('#00ff00')
                .setAuthor({ name: 'ループ設定' })
                .setDescription(`現在のループ設定は **${player.loop ? '有効' : '無効'}** です。`);
            return interaction.reply({ embeds: [embed] });
        }

        if (loopState === 'enabled') {
            player.setTrackRepeat(true);
            const embed = new EmbedBuilder()
                .setColor('#00ff00')
                .setAuthor({ name: 'ループ設定' })
                .setDescription('音楽のループが **有効** に設定されました。');
            return interaction.reply({ embeds: [embed] });
        } else if (loopState === 'disabled') {
            player.setTrackRepeat(false);
            const embed = new EmbedBuilder()
                .setColor('#ff0000')
                .setAuthor({ name: 'ループ設定' })
                .setDescription('音楽のループが **無効** に設定されました。');
            return interaction.reply({ embeds: [embed] });
        }
    },
};