const { SlashCommandBuilder } = require('@discordjs/builders');
const { EmbedBuilder, ChannelType } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('server_info')
        .setDescription('サーバーの情報を表示します。'),

    async execute(interaction) {
        try {
            const guild = interaction.guild;
            const members = await guild.members.fetch();
            const bot = members.filter(m => m.user.bot);
            const online = members.filter(member => member.presence?.status === "online");
            const dnd = members.filter(member => member.presence?.status === "dnd");
            const idle = members.filter(member => member.presence?.status === "idle");
            const offline = members.filter(member => member.presence?.status === "offline" || !member.presence?.status);

            const channels = await guild.channels.fetch();
            const text = channels.filter(ch => ch.type === ChannelType.GuildText);
            const voice = channels.filter(ch => ch.type === ChannelType.GuildVoice);
            const category = channels.filter(ch => ch.type === ChannelType.GuildCategory);

            const roles = await guild.roles.fetch();
            const emojis = await guild.emojis.fetch();
            const stickers = await guild.stickers.fetch();

            const serverEmbed = new EmbedBuilder()
                .setColor('#0099ff')
                .setTitle(`${guild.name} サーバー情報`)
                .setThumbnail(guild.iconURL() || '')
                .setTimestamp();

            serverEmbed.addFields(
                { name: '基本情報', value: `**サーバーID:** ${guild.id}\n**所有者:** <@${guild.ownerId}>\n**作成日:** ${guild.createdAt.toLocaleDateString()}` },
            );

            serverEmbed.addFields(
                { name: 'メンバー情報', value: `**メンバー数:** ${members.size}人 (ユーザー: ${members.size - bot.size}, BOT: ${bot.size})\n**オンライン:** ${online.size}人\n**退席中:** ${idle.size}人\n**取り込み中:** ${dnd.size}人\n**オフライン:** ${offline.size}人` },
            );
            serverEmbed.addFields(
                { name: 'アクティビティ', value: guild.presenceCount ? `${guild.presenceCount}人のアクティビティ` : 'なし' },
            );

            serverEmbed.addFields(
                { name: 'チャンネル情報', value: `**カテゴリー数:** ${category.size}\n**テキストチャンネル数:** ${text.size}\n**ボイスチャンネル数:** ${voice.size}` },
            );

            serverEmbed.addFields(
                { name: 'その他の情報', value: `**ロール数:** ${roles.size}\n**絵文字数:** ${emojis.size}\n**ステッカー数:** ${stickers.size}\n**サーバーNitro数:** ${guild.premiumSubscriptionCount || 0}` },
            );
            await interaction.reply({ embeds: [serverEmbed] });
        } catch (error) {
            console.error('サーバー情報の取得中にエラーが発生しました:', error);
            await interaction.reply({ content: 'サーバー情報の取得中にエラーが発生しました。', ephemeral: true });
        }
    },
};
