const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fetch = require('node-fetch');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('応答速度を計測します'),
    async execute(interaction) {
        const initialEmbed = new EmbedBuilder()
            .setColor('#00AAFF')
            .setTitle('計測中')
            .setDescription('計測中...')
            .setTimestamp();

        const reply = await interaction.reply({
            embeds: [initialEmbed],
            fetchReply: true,
        });

        const apiPings = [];
        let lostPackets = 0;
        const totalPackets = 4;

        for (let i = 0; i < totalPackets; i++) {
            const startTime = Date.now();
            try {
                await fetch('https://discord.com/api/v10');
                const latency = Date.now() - startTime;
                apiPings.push(latency);
            } catch {
                lostPackets++;
            }
        }
        const averageApiPing = apiPings.length > 0 ? apiPings.reduce((a, b) => a + b) / apiPings.length : 0;
        const packetLossRate = ((lostPackets / totalPackets) * 100).toFixed(2);
        let hostPingResult;
        try {
            const { stdout } = await execPromise('ping -c 4 discord.com');
            hostPingResult = stdout;
        } catch (error) {
            hostPingResult = 'ホスト側のping計測に失敗しました';
        }
        const hostPingMatch = hostPingResult.match(/rtt min\/avg\/max\/mdev = .+\/(.+?)\/.+ ms/);
        const averageHostPing = hostPingMatch ? hostPingMatch[1] : '不明';
        const resultEmbed = new EmbedBuilder()
            .setColor('#00FF00')
            .setTitle('Ping計測結果')
            .addFields(
                { name: 'Discord API Ping (平均)', value: `${averageApiPing.toFixed(2)} ms`, inline: true },
                { name: 'パケットロス率', value: `${packetLossRate}% (${lostPackets}/${totalPackets} パケット)`, inline: true },
                { name: 'ホストPing (平均)', value: `${averageHostPing} ms`, inline: true }
            )
            .setTimestamp();
        await interaction.editReply({ embeds: [resultEmbed] });
    },
};