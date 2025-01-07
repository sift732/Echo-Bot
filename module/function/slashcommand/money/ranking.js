const { SlashCommandBuilder } = require('@discordjs/builders');
const { EmbedBuilder } = require('discord.js');
const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('db/money.db');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('money_ranking')
        .setDescription('お金持ちランキングを表示します')
        .addStringOption(option =>
            option.setName('種類')
                .setDescription('ランキングのタイプを選択')
                .setRequired(true)
                .addChoices(
                    { name: 'サーバー内', value: 'server' },
                    { name: '導入サーバー', value: 'global' },
                )),

    async execute(interaction) {
        const rankingType = interaction.options.getString('種類');
        const loadingEmbed = new EmbedBuilder()
            .setColor('#ffa500')
            .setTitle('ランキング取得中...')
            .setDescription('少々お待ちください...')
            .setTimestamp();
        
        const reply = await interaction.reply({ embeds: [loadingEmbed], fetchReply: true });

        const getServerRanking = async () => {
            try {
                const members = await interaction.guild.members.fetch();
                const userIds = members.map(member => member.id);
                const coinsQuery = `SELECT discord_id, coins FROM users WHERE discord_id IN (${userIds.map(() => '?').join(', ')}) ORDER BY coins DESC LIMIT 20`;
                
                return new Promise((resolve, reject) => {
                    db.all(coinsQuery, userIds, (err, rows) => {
                        if (err) {
                            console.error('データ取得エラー:', err);
                            reject(err);
                        }
                        resolve(rows);
                    });
                });
            } catch (error) {
                console.error('サーバー内ランキング取得エラー:', error);
                throw new Error('サーバー内ランキングの取得に失敗しました');
            }
        };

        const getGlobalRanking = () => {
            return new Promise((resolve, reject) => {
                db.all('SELECT discord_id, coins FROM users ORDER BY coins DESC LIMIT 20', (err, rows) => {
                    if (err) {
                        console.error('データ取得エラー:', err);
                        reject(err);
                    }
                    resolve(rows);
                });
            });
        };

        try {
            let rankingData = [];

            if (rankingType === 'server') {
                rankingData = await getServerRanking();
            } else if (rankingType === 'global') {
                rankingData = await getGlobalRanking();
            }

            if (!rankingData || rankingData.length === 0) {
                const noDataEmbed = new EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle('ランキング')
                    .setDescription('ランキングデータがありません。')
                    .setTimestamp();
                return await interaction.editReply({ embeds: [noDataEmbed] });
            }

            const getUserName = async (userId) => {
                const user = await interaction.guild.members.fetch(userId);
                return user ? user.displayName : '不明なユーザー';
            };

            let rankingList = '';
            for (let i = 0; i < rankingData.length; i++) {
                const row = rankingData[i];
                const userName = await getUserName(row.discord_id);
                rankingList += `${i + 1}. ${userName} (${row.discord_id}) : ${row.coins} コイン\n`;
            }

            const embed = new EmbedBuilder()
                .setColor('#0099ff')
                .setTitle(rankingType === 'server' ? 'サーバー内お金持ちランキング' : '導入サーバーお金持ちランキング')
                .setDescription(rankingList)
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('エラー:', error);
            const errorEmbed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('エラー')
                .setDescription('ランキングの取得中にエラーが発生しました。')
                .setTimestamp();

            await interaction.editReply({ embeds: [errorEmbed] });
        }
    },
};
