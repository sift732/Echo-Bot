const { SlashCommandBuilder } = require('@discordjs/builders');
const { EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('music_queue')
        .setDescription('キューに追加された曲のリストを表示します'),

    async execute(interaction) {
        const guildId = interaction.guildId;
        const player = interaction.client.manager.players.get(guildId);

        if (!player || player.queue.size === 0) {
            const embed = new EmbedBuilder()
                .setColor('#ff0000')
                .setAuthor({ 
                    name: 'エラー', 
                })
                .setTitle('キューは空です')
                .setDescription('現在、キューに曲が追加されていません。');
            return interaction.reply({ embeds: [embed] });
        }

        const queueEmbed = new EmbedBuilder()
            .setColor('#0000ff')
            .setAuthor({ 
                name: 'キューに追加された曲', 
            })
            .setDescription('以下は現在キューに追加されている曲のリストです');

        let trackNumber = 1;
        player.queue.forEach((track) => {
            queueEmbed.addFields({
                name: `曲 ${trackNumber++}: ${track.title}`,
                value: `[リンク](${track.uri})\nリクエスト者: ${track.requester.tag}`,
                inline: false
            });
            queueEmbed.addFields({
                name: '\u200B',
                value: '----------------------------------------',
                inline: false
            });
        });

        return interaction.reply({ embeds: [queueEmbed] });
    },
};