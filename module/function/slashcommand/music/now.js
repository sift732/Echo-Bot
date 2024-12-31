const { SlashCommandBuilder } = require('@discordjs/builders');
const { EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('music_now')
        .setDescription('現在再生中の曲を表示します'),

    async execute(interaction) {
        const guildId = interaction.guildId;
        const manager = interaction.client.manager;

        const player = manager.players.get(guildId);

        if (!player || !player.queue.current) {
            const embed = new EmbedBuilder()
                .setColor('#ff0000')
                .setAuthor({ name: 'エラー' })
                .setDescription('現在再生中の曲はありません。');
            return interaction.reply({ embeds: [embed], ephemeral: true });
        }

        const currentTrack = player.queue.current;

        const embed = new EmbedBuilder()
            .setColor('#00ff00')
            .setAuthor({ name: '現在再生中の曲' })
            .setDescription(`**[${currentTrack.title}](${currentTrack.uri})**`)
            .addFields(
                { name: 'アップロード者', value: currentTrack.author || '不明', inline: true },
                { name: '長さ', value: formatDuration(currentTrack.duration), inline: true }
            )
            .setThumbnail(currentTrack.thumbnail)
            .setFooter({ text: `再生中のプレイヤー: ${player.options.guild} | 音量: ${player.volume}%` });

        return interaction.reply({ embeds: [embed] });
    },
};

function formatDuration(milliseconds) {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = Math.round(totalSeconds % 60);

    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}
