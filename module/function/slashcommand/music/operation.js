const { SlashCommandBuilder } = require('@discordjs/builders');
const { EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('music_operation')
        .setDescription('指定した時間に曲をスキップします')
        .addStringOption(option => 
            option.setName('時間')
                .setDescription('スキップする時間を秒、分:秒、または時間:分:秒形式で指定します')
                .setRequired(true)
        ),

    async execute(interaction) {
        const guildId = interaction.guildId;
        const player = interaction.client.manager.players.get(guildId);
        if (!player || !player.playing) {
            const embed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('エラー')
                .setDescription('音楽が再生されていないため、操作はできません。');
            return interaction.reply({ embeds: [embed] });
        }

        const timeString = interaction.options.getString('時間');

        const timeRegex = /^(?:(\d+):(\d{2}):(\d{2})|(\d{2}):(\d{2})|(\d+))$/;
        const match = timeString.match(timeRegex);

        if (!match) {
            const embed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('エラー')
                .setDescription('時間は秒、分:秒、または時間:分:秒形式で指定してください。');
            return interaction.reply({ embeds: [embed] });
        }

        let totalSeconds = 0;
        if (match[1] && match[2] && match[3]) {
            totalSeconds = (parseInt(match[1]) * 3600) + (parseInt(match[2]) * 60) + parseInt(match[3]);
        }
        else if (match[4] && match[5]) {
            totalSeconds = (parseInt(match[4]) * 60) + parseInt(match[5]);
        }
        else if (match[6]) {
            totalSeconds = parseInt(match[6]);
        }

        const trackDuration = player.queue.current.duration / 1000;

        if (totalSeconds > trackDuration) {
            const embed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('エラー')
                .setDescription(`指定した時間は曲の長さ(${formatDuration(trackDuration)})を超えています。`);
            return interaction.reply({ embeds: [embed] });
        }

        player.seek(totalSeconds * 1000);

        const embed = new EmbedBuilder()
            .setColor('#00ff00')
            .setTitle('指定時間までスキップしました')
            .setDescription(`${timeString}までスキップしました`);

        return interaction.reply({ embeds: [embed] });
    },
};

function formatDuration(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    
    if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    } else {
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
}
