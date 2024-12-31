const { SlashCommandBuilder } = require('@discordjs/builders');
const { EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('music_skip')
        .setDescription('再生中の音楽をスキップして次の曲を再生します'),

    async execute(interaction) {
        const guildId = interaction.guildId;
        const manager = interaction.client.manager;

        try {
            const player = manager.players.get(guildId);

            if (!player) {
                const embed = new EmbedBuilder()
                    .setColor('#ff0000')
                    .setAuthor({ name: 'エラー' })
                    .setDescription('音楽が再生されていません');
                return interaction.reply({ embeds: [embed] });
            }

            if (player.queue.size === 0 || !player.queue.current) {
                const embed = new EmbedBuilder()
                    .setColor('#ff0000')
                    .setAuthor({ name: 'エラー' })
                    .setDescription('次の曲が存在しません');
                return interaction.reply({ embeds: [embed] });
            }

            if (player.trackRepeat || player.queueRepeat) {
                player.setTrackRepeat(false);
                player.setQueueRepeat(false);
            }

            player.stop();

            const embed = new EmbedBuilder()
                .setColor('#00ff00')
                .setAuthor({ name: '成功' })
                .setDescription('現在の曲をスキップし、次の曲を再生します');
            return interaction.reply({ embeds: [embed] });

        } catch (error) {
            console.error('スキップ中にエラーが発生しました:', error);
            const embed = new EmbedBuilder()
                .setColor('#ff0000')
                .setAuthor({ name: 'エラー' })
                .setDescription('スキップ中にエラーが発生しました');
            return interaction.reply({ embeds: [embed] });
        }
    },
};