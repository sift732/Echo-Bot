const { SlashCommandBuilder } = require('@discordjs/builders');
const { EmbedBuilder } = require('discord.js');
const sqlite3 = require('sqlite3').verbose();

const dbMoney = new sqlite3.Database('db/money.db');
const dbGacha = new sqlite3.Database('db/gacha.db');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('money_buy')
        .setDescription('ガチャを購入します')
        .addStringOption(option =>
            option.setName('購入回数')
                .setDescription('ガチャの回数を選択')
                .setRequired(true)
                .addChoices(
                    { name: '1回', value: '1' },
                    { name: '10回', value: '10' },
                    { name: '20回', value: '20' },
                    { name: '50回', value: '50' },
                    { name: '100回', value: '100' },
                )),

    async execute(interaction) {
        try {
            const userId = interaction.user.id;
            const amount = interaction.options.getString('購入回数');
            const coinMultiplier = {
                '1': 100,
                '10': 1000,
                '20': 20000,
                '50': 500000,
                '100': 1000000,
            };

            const requiredCoins = coinMultiplier[amount];
            const totalRequiredCoins = Math.floor(requiredCoins * 1.1);
            const getUserData = (userId) => {
                return new Promise((resolve, reject) => {
                    dbMoney.get('SELECT coins FROM users WHERE discord_id = ?', [userId], (err, row) => {
                        if (err) {
                            reject(err);
                        }
                        resolve(row);
                    });
                });
            };

            const row = await getUserData(userId);
            if (!row || row.coins < totalRequiredCoins) {
                const errorEmbed = new EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle('エラー')
                    .setDescription(`コインが不足しています。ガチャの購入には**${totalRequiredCoins}コイン**が必要です。`)
                    .setTimestamp();
                return await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            }
            const newCoins = row.coins - totalRequiredCoins;
            dbMoney.run('UPDATE users SET coins = ? WHERE discord_id = ?', [newCoins, userId]);
            const getUserGachaData = (userId) => {
                return new Promise((resolve, reject) => {
                    dbGacha.get('SELECT amount FROM gacha_purchases WHERE discord_id = ?', [userId], (err, row) => {
                        if (err) {
                            reject(err);
                        }
                        resolve(row);
                    });
                });
            };

            const gachaRow = await getUserGachaData(userId);
            if (gachaRow) {
                const updatedAmount = gachaRow.amount + parseInt(amount);
                dbGacha.run('UPDATE gacha_purchases SET amount = ? WHERE discord_id = ?', [updatedAmount, userId]);
            } else {
                dbGacha.run('INSERT INTO gacha_purchases (discord_id, amount) VALUES (?, ?)', [userId, amount]);
            }

            const successEmbed = new EmbedBuilder()
                .setColor('#0099ff')
                .setTitle('ガチャ購入成功')
                .setDescription(` ${amount} 回分のガチャを購入しました。手数料が加算されました。`)
                .addFields(
                    { name: '購入に使用したコイン', value: `${totalRequiredCoins}コイン` },
                    { name: '現在の所持コイン数', value: `${newCoins}コイン` }
                )
                .setTimestamp();

            await interaction.reply({ embeds: [successEmbed] });

        } catch (error) {
            console.error('エラー:', error);
            const errorEmbed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('エラー')
                .setDescription('ガチャ購入処理中にエラーが発生しました。')
                .setTimestamp();

            await interaction.reply({ embeds: [errorEmbed] });
        }
    },
};
