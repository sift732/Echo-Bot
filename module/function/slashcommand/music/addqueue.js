const { SlashCommandBuilder } = require('@discordjs/builders');
const { EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('music_addqueue')
        .setDescription('指定された曲をキューに追加します')
        .addStringOption(option =>
            option.setName('リンクまたは曲名')
                .setDescription('追加する曲のリンクまたは曲名')
                .setRequired(true)
        ),

    async execute(interaction) {
        const query = interaction.options.getString('リンクまたは曲名');
        const guildId = interaction.guildId;
        const member = interaction.member;

        const player = interaction.client.manager.players.get(guildId);
        
        if (!player) {
            const embed = new EmbedBuilder()
                .setColor('#ff0000')
                .setAuthor({ name: 'エラー' })
                .setDescription('音楽が再生されていません。先に `/music_play` コマンドを実行して再生を開始してください。');
            return interaction.reply({ embeds: [embed] });
        }

        const manager = interaction.client.manager;

        try {
            const results = await manager.search(query, interaction.user);

            if (!results || results.loadType === 'NO_MATCHES') {
                const embed = new EmbedBuilder()
                    .setColor('#ff0000')
                    .setAuthor({ name: 'エラー' })
                    .setDescription('指定されたURLまたは曲名で音楽が見つかりませんでした');
                return interaction.reply({ embeds: [embed] });
            }

            const track = results.tracks[0];
            await player.queue.add(track);

            const embed = new EmbedBuilder()
                .setColor('#00ff00')
                .setAuthor({ name: '曲追加' })
                .setDescription(`**[${track.title}](${track.uri})** をキューに追加しました。`);

            await interaction.reply({ embeds: [embed] });
            if (!player.playing && !player.paused && player.queue.size > 0) {
                await player.play();
            }
        } catch (error) {
            console.error('曲追加時のエラー:', error);
            const embed = new EmbedBuilder()
                .setColor('#ff0000')
                .setAuthor({ name: 'エラー' })
                .setDescription('曲をキューに追加できませんでした。再度試してください。');
            interaction.reply({ embeds: [embed] });
        }
    },
};
