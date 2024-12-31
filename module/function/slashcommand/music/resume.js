const { SlashCommandBuilder } = require('@discordjs/builders');
const { EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('music_resume')
        .setDescription('一時停止した音楽を再開します'),

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
        if (player.playing) {
            const embed = new EmbedBuilder()
                .setColor('#ffff00')
                .setAuthor({ name: '注意' })
                .setDescription('音楽は既に再生されています。');
            return interaction.reply({ embeds: [embed], ephemeral: true });
        }

        try {
            player.pause(false);

            const embed = new EmbedBuilder()
                .setColor('#00ff00')
                .setAuthor({ name: '音楽再開' })
                .setDescription('一時停止していた音楽を再開しました！');
            return interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.error('音楽再開中のエラー:', error);
            const embed = new EmbedBuilder()
                .setColor('#ff0000')
                .setAuthor({ name: 'エラー' })
                .setDescription('音楽の再開中にエラーが発生しました。数分後に再試行してください。');
            return interaction.reply({ embeds: [embed] });
        }
    },
};
