const { SlashCommandBuilder } = require('@discordjs/builders');
const { EmbedBuilder } = require('discord.js');
const sqlite3 = require('sqlite3').verbose();

const dbMoney = new sqlite3.Database('db/money.db');
const dbGacha = new sqlite3.Database('db/gacha.db');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('money_list')
        .setDescription('現在所持しているコイン数と残りのガチャ回数を表示します'),

    async execute(interaction) {
        try {
            const userId = interaction.user.id;
            const getUserData = (userId) => {
                return new Promise((resolve, reject) => {
                    dbMoney.get('SELECT coins FROM users WHERE discord_id = ?', [userId], (err, row) => {
                        if (err) {
                            console.error('データ取得エラー:', err);
                            reject(err);
                        }
                        resolve(row);
                    });
                });
            };

            const row = await getUserData(userId);

            if (!row) {
                const embed = new EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle('エラー')
                    .setDescription('まだコインが記録されていません。')
                    .setFooter({ text: 'コインを稼いでから確認できます！' })
                    .setTimestamp();
                return await interaction.reply({ embeds: [embed], ephemeral: true });
            }

            const getUserGachaData = (userId) => {
                return new Promise((resolve, reject) => {
                    dbGacha.get('SELECT amount FROM gacha_purchases WHERE discord_id = ?', [userId], (err, row) => {
                        if (err) {
                            console.error('データ取得エラー:', err);
                            reject(err);
                        }
                        resolve(row);
                    });
                });
            };

            const gachaData = await getUserGachaData(userId);
            const remainingGacha = gachaData ? gachaData.amount : 0;
            const embed = new EmbedBuilder()
                .setColor('#0099ff')
                .setTitle('現在の所持コインと残りガチャ回数')
                .setDescription(`あなたは現在 **${row.coins} コイン**を所持しています。`)
                .addFields(
                    { name: '残りガチャ回数', value: `${remainingGacha}回`, inline: true }
                )
                .setFooter({ text: '引き続き頑張ってください！' })
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });

        } catch (error) {
            console.error('エラー:', error);
            const errorEmbed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('エラー')
                .setDescription('情報取得中にエラーが発生しました。')
                .setFooter({ text: '再試行してみてください。' })
                .setTimestamp();

            await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }
    },
};
