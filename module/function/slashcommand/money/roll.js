const { SlashCommandBuilder } = require('@discordjs/builders');
const { EmbedBuilder } = require('discord.js');
const sqlite3 = require('sqlite3').verbose();

const dbMoney = new sqlite3.Database('db/money.db');
const dbGacha = new sqlite3.Database('db/gacha.db');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('money_roll')
        .setDescription('ガチャを引きます')
        .addStringOption(option =>
            option.setName('引く回数')
                .setDescription('ガチャの回数を選択')
                .setRequired(true)
                .addChoices(
                    { name: '1回', value: '1' },
                    { name: '10回', value: '10' },
                    { name: '20回', value: '20' },
                    { name: '50回', value: '50' },
                    { name: '100回', value: '100' },
                    { name: '残りすべて', value: 'all' },
                )),

    async execute(interaction) {
        try {
            const userId = interaction.user.id;
            const amount = interaction.options.getString('引く回数');
            let decreaseAmount = parseInt(amount);
            const getUserGachaData = (userId) => {
                return new Promise((resolve, reject) => {
                    dbGacha.get('SELECT amount FROM gacha_purchases WHERE discord_id = ?', [userId], (err, row) => {
                        if (err) reject(err);
                        resolve(row);
                    });
                });
            };

            const gachaData = await getUserGachaData(userId);

            if (!gachaData || gachaData.amount <= 0) {
                const errorEmbed = new EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle('エラー')
                    .setDescription('ガチャを購入した履歴がありません。')
                    .setTimestamp();
                return await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            }

            if (amount === 'all') {
                decreaseAmount = gachaData.amount;
            }
            if (gachaData.amount < decreaseAmount) {
                const errorEmbed = new EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle('エラー')
                    .setDescription('ガチャが足りません。購入したガチャ数を確認してください。')
                    .setTimestamp();
                return await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            }

            const updatedAmount = gachaData.amount - decreaseAmount;
            dbGacha.run('UPDATE gacha_purchases SET amount = ? WHERE discord_id = ?', [updatedAmount, userId]);
            const rollGacha = () => {
                const random = Math.random();
                if (random < 0.00001) {
                    return 100000;
                } else if (random < 0.5) {
                    return Math.floor(Math.random() * (1000 - 50 + 1)) + 50;
                } else if (random < 0.9) {
                    return Math.floor(Math.random() * (50000 - 10000 + 1)) + 10000;
                } else {
                    return Math.floor(Math.random() * (1000000 - 50000 + 1)) + 50000;
                }
            };

            let totalCoins = 0;
            let results = [];
            let rolls = decreaseAmount;

            for (let i = 0; i < rolls; i++) {
                const coinAmount = rollGacha();
                totalCoins += coinAmount;
                results.push(`${coinAmount}コイン`);
            }
            const getUserMoney = (userId) => {
                return new Promise((resolve, reject) => {
                    dbMoney.get('SELECT coins FROM users WHERE discord_id = ?', [userId], (err, row) => {
                        if (err) reject(err);
                        resolve(row);
                    });
                });
            };

            const userMoney = await getUserMoney(userId);
            const newCoins = userMoney.coins + totalCoins;
            dbMoney.run('UPDATE users SET coins = ? WHERE discord_id = ?', [newCoins, userId]);
            const successEmbed = new EmbedBuilder()
                .setColor('#0099ff')
                .setTitle('ガチャ結果')
                .setDescription(`ガチャを**${rolls}回**引きました！`)
                .addFields(
                    { name: '結果', value: results.join('\n') },
                    { name: '合計コイン数', value: `${totalCoins}コイン` },
                    { name: '現在の所持コイン数', value: `${newCoins}コイン` }
                )
                .setFooter({ text: '出たコイン数はランダムに変化します。' })
                .setTimestamp();

            await interaction.reply({ embeds: [successEmbed] });

        } catch (error) {
            console.error('エラー:', error);
            const errorEmbed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('エラー')
                .setDescription('ガチャの引き中にエラーが発生しました。')
                .setTimestamp();

            await interaction.reply({ embeds: [errorEmbed] });
        }
    },
};
