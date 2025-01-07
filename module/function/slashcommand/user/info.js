const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const moment = require('moment');
moment.locale('ja');
const { supabase } = require('../../../event/connect');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('user_info')
        .setDescription('指定したユーザーの情報を表示します')
        .addUserOption(option =>
            option
                .setName('対象')
                .setDescription('情報を取得するユーザー')
                .setRequired(false)
        ),
    async execute(interaction) {
        const target = interaction.options.getUser('対象') || interaction.user;
        const member = await interaction.guild.members.fetch(target.id);

        const createdAt = moment(target.createdAt);
        const joinedAt = moment(member.joinedAt);
        const now = moment();
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('discord_id', target.id)
            .single();

        let registrationStatus;
        if (error || !data) {
            registrationStatus = `[未登録](https://echo-bot-page.glitch.me/index.html?page=auth)`;
        } else {
            registrationStatus = '登録済み';
        }

        const embed = new EmbedBuilder()
            .setTitle(`${target.tag} の情報`)
            .setThumbnail(target.displayAvatarURL({ dynamic: true }))
            .addFields(
                { name: 'ID', value: target.id, inline: true },
                {
                    name: 'アカウント作成日',
                    value: `${createdAt.format('YYYY年MM月DD日')} （${now.diff(createdAt, 'days')}日前）`,
                    inline: true,
                },
                {
                    name: 'サーバー参加日',
                    value: `${joinedAt.format('YYYY年MM月DD日')} （${now.diff(joinedAt, 'days')}日前）`,
                    inline: true,
                },
                {
                    name: 'アカウント種類',
                    value: target.bot ? 'BOT' : 'ユーザー',
                    inline: true,
                },
                {
                    name: 'Echo-AC登録状況',
                    value: registrationStatus,
                    inline: true,
                },
                {
                    name: '付与されているロール',
                    value: member.roles.cache
                        .filter(role => role.name !== '@everyone')
                        .map(role => role.name)
                        .join(', ') || 'なし',
                    inline: false,
                }
            )
            .setColor('#00FF00')
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    },
};