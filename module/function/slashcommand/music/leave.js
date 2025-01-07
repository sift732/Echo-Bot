const { SlashCommandBuilder } = require('@discordjs/builders');
const { EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('music_leave')
        .setDescription('ボイスチャンネルから音楽ボットを退出させます'),

    async execute(interaction) {
        const guildId = interaction.guildId;
        const member = interaction.member;

        if (!member.voice.channel) {
            const embed = new EmbedBuilder()
                .setColor('#ff0000')
                .setAuthor({ name: 'エラー' })
                .setDescription('ボイスチャンネルに参加してからコマンドを実行してください。');
            return interaction.reply({ embeds: [embed] });
        }

        const player = interaction.client.manager.players.get(guildId);

        if (!player) {
            const embed = new EmbedBuilder()
                .setColor('#ff0000')
                .setAuthor({ name: 'エラー' })
                .setDescription('音楽が再生中ではありません。');
            return interaction.reply({ embeds: [embed] });
        }
        try {
            player.stop();
            player.destroy();

            const embed = new EmbedBuilder()
                .setColor('#00ff00')
                .setAuthor({ name: '退出' })
                .setDescription('ボイスチャンネルから退出しました。');
            return interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.error('音楽ボット退室時のエラー:', error);
            const embed = new EmbedBuilder()
                .setColor('#ff0000')
                .setAuthor({ name: 'エラー' })
                .setDescription('ボットが退出できませんでした。後ほど再試行してください。');
            return interaction.reply({ embeds: [embed] });
        }
    },
};