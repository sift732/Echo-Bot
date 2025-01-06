const { SlashCommandBuilder } = require('@discordjs/builders');
const { EmbedBuilder, WebhookClient } = require('discord.js');
require('dotenv').config();

let nowPlayingMessages = new Map();

const webhookClient = new WebhookClient({ url: process.env.PLAYER_WEBHOOK_URL });

module.exports = {
    data: new SlashCommandBuilder()
        .setName('music_play')
        .setDescription('ボイスチャンネルで音楽を再生します')
        .addStringOption(option =>
            option.setName('リクエスト')
                .setDescription('URLまたは曲名を指定します')
                .setRequired(true)
        ),

    async execute(interaction) {
        const query = interaction.options.getString('リクエスト');
        const guildId = interaction.guildId;
        const member = interaction.member;

        if (!member.voice.channel) {
            const embed = new EmbedBuilder()
                .setColor('#ff0000')
                .setAuthor({ name: 'エラー' })
                .setDescription('ボイスチャンネルに参加してからコマンドを実行してください。');
            return interaction.reply({ embeds: [embed] });
        }

        const voiceChannel = member.voice.channel;
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

            let player = manager.players.get(guildId);

            if (!player) {
                try {
                    const playerOptions = {
                        guild: guildId,
                        voiceChannel: voiceChannel.id,
                        textChannel: interaction.channel.id,
                        volume: 50,
                    };

                    player = manager.create(playerOptions);
                    await player.connect();

                    sendWebhookNotification(playerOptions);
                } catch (creationError) {
                    console.error(`プレイヤー作成中のエラー: ${creationError.message}`);
                    return interaction.reply({
                        embeds: [new EmbedBuilder()
                            .setColor('#ff0000')
                            .setAuthor({ name: 'エラー' })
                            .setDescription('プレイヤー作成中にエラーが発生しました。')]
                    });
                }
            }

            if (results.loadType === 'PLAYLIST_LOADED') {
                const tracks = results.tracks.slice(0, 15);
                for (const track of tracks) {
                    await player.queue.add(track);
                }

                const embed = new EmbedBuilder()
                    .setColor('#00ff00')
                    .setAuthor({ name: 'プレイリスト追加' })
                    .setDescription(`プレイリスト **${results.playlist.name}** から ${tracks.length} 曲をキューに追加しました。`);
                await interaction.reply({ embeds: [embed] });

                if (!player.playing && !player.paused && player.queue.totalSize === tracks.length) {
                    await player.play();
                    const message = await interaction.channel.send({ embeds: [createEmbed(tracks[0], player)], fetchReply: true });
                    nowPlayingMessages.set(guildId, { id: message.id, channelId: message.channel.id });
                }
            } else {
                const track = results.tracks[0];

                if (!track) {
                    const embed = new EmbedBuilder()
                        .setColor('#ff0000')
                        .setAuthor({ name: 'エラー' })
                        .setDescription('検索結果に有効なトラックが見つかりませんでした');
                    return interaction.reply({ embeds: [embed] });
                }

                if (player.playing && player.queue.size) {
                    const embed = new EmbedBuilder()
                        .setColor('#ffff00')
                        .setAuthor({ name: '失敗' })
                        .setDescription('現在再生中の曲があります。新しい曲をキューに追加するには、/music_addqueue [URLまたは曲名] を実行してください。');
                    return interaction.reply({ embeds: [embed] });
                }

                await player.queue.add(track);

                if (!player.playing && !player.paused && !player.queue.size) {
                    await player.play();

                    const message = await interaction.reply({ embeds: [createEmbed(track, player)], fetchReply: true });
                    nowPlayingMessages.set(guildId, { id: message.id, channelId: message.channel.id });

                    monitorVoiceChannel(player, interaction.client);
                } else {
                    if (!player.playing && player.queue.size) {
                        await player.play();
                        const message = await interaction.reply({ embeds: [createEmbed(track, player)], fetchReply: true });
                        nowPlayingMessages.set(guildId, { id: message.id, channelId: message.channel.id });
                    }
                }
            }
        } catch (error) {
            console.error('音楽再生時のエラー:', error);
            const embed = new EmbedBuilder()
                .setColor('#ff0000')
                .setAuthor({ name: 'エラー' })
                .setDescription('音楽を再生できませんでした。数分後に再度実行してください');
            interaction.reply({ embeds: [embed] });
        }
    },
};

function createEmbed(track, player) {
    return new EmbedBuilder()
        .setColor('#00ff00')
        .setAuthor({ name: '再生中' })
        .setDescription(`再生中：**[${track.title}](${track.uri})**`)
        .addFields(
            { name: 'アップロード者', value: track.author || '不明', inline: true },
            { name: '長さ', value: formatDuration(track.duration), inline: true }
        )
        .setThumbnail(track.thumbnail)
        .setFooter({ text: `再生中のプレイヤー: ${player.options.guild} | チャンネル: ${player.options.voiceChannel}` });
}

function formatDuration(milliseconds) {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function monitorVoiceChannel(player, client) {
    client.on('voiceStateUpdate', (oldState, newState) => {
        if (oldState.guild.id !== player.guild) return;
        if (oldState.channelId === newState.channelId) return;
        if (oldState.channel && oldState.channel.members.size === 1 && oldState.channel.members.has(client.user.id)) {
            const botPlayer = client.manager.players.get(player.guild);
            if (botPlayer) {
                botPlayer.stop();
                botPlayer.destroy();

                const nowPlaying = nowPlayingMessages.get(player.guild);
                if (nowPlaying) {
                    const channel = client.channels.cache.get(nowPlaying.channelId);
                    if (channel) {
                        const embed = new EmbedBuilder()
                            .setColor('#ff0000')
                            .setAuthor({ name: '離脱' })
                            .setDescription('VCに誰もいなくなったため、自動で退出しました。');

                        channel.send({ embeds: [embed] });
                    }
                }
                nowPlayingMessages.delete(player.guild);
            }
        }
    });
}

function sendWebhookNotification(playerOptions) {
    const embed = new EmbedBuilder()
        .setColor('#00ff00')
        .setAuthor({ name: 'プレイヤー作成' })
        .setDescription('新しいプレイヤーが作成されました')
        .addFields(
            { name: 'サーバーID', value: playerOptions.guild, inline: true },
            { name: 'ボイスチャンネルID', value: playerOptions.voiceChannel, inline: true },
            { name: 'テキストチャンネルID', value: playerOptions.textChannel, inline: true },
            { name: 'ボリューム', value: playerOptions.volume.toString(), inline: true }
        );

    webhookClient.send({
        embeds: [embed],
    });
}
