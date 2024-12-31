const { SlashCommandBuilder } = require('@discordjs/builders');
const { EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('music_stop')
        .setDescription('現在再生中の音楽を一時停止します'),

    async execute(interaction) {
        const guildId = interaction.guildId;
        const manager = interaction.client.manager;
        const player = manager.players.get(guildId);
        if (!player) {
            const embed = new EmbedBuilder()
                .setColor('#ff0000')
                .setAuthor({ name: 'エラー' })
                .setDescription('現在、再生中の音楽はありません。');
            return interaction.reply({ embeds: [embed], ephemeral: true });
        }
        if (!player.playing) {
            const embed = new EmbedBuilder()
                .setColor('#ffff00')
                .setAuthor({ name: '注意' })
                .setDescription('音楽は既に一時停止されています。');
            return interaction.reply({ embeds: [embed], ephemeral: true });
        }

        try {
            player.pause(true);

            const embed = new EmbedBuilder()
                .setColor('#00ff00')
                .setAuthor({ name: '音楽停止' })
                .setDescription('音楽を一時停止しました。再開するには `/music_resume` コマンドを実行してください。');
            return interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.error('音楽停止中のエラー:', error);
            const embed = new EmbedBuilder()
                .setColor('#ff0000')
                .setAuthor({ name: 'エラー' })
                .setDescription('音楽の停止中にエラーが発生しました。数分後に再試行してください。');
            return interaction.reply({ embeds: [embed] });
        }
    },
};
