const { SlashCommandBuilder } = require('@discordjs/builders');
const { EmbedBuilder } = require('discord.js');
const sqlite3 = require('sqlite3').verbose();

const dbMoney = new sqlite3.Database('db/money.db');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('money_think')
        .setDescription('コインを賭けて結果を予測します')
        .addIntegerOption(option =>
            option.setName('賭けるコイン')
                .setDescription('賭けるコイン数')
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('数字')
                .setDescription('1〜4のいずれかの数字を選んでください')
                .setRequired(true)
                .addChoices(
                    { name: '1', value: 1 },
                    { name: '2', value: 2 },
                    { name: '3', value: 3 },
                    { name: '4', value: 4 }
                )),

    async execute(interaction) {
        try {
            const userId = interaction.user.id;
            const amount = interaction.options.getInteger('賭けるコイン');
            const number = interaction.options.getInteger('数字');
            const fee = Math.floor(amount * 0.03);
            const totalAmountNeeded = amount + fee;

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
            if (!row || row.coins < totalAmountNeeded) {
                const errorEmbed = new EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle('エラー')
                    .setDescription(`コインが不足しています。現在所持しているコインは**${row.coins}コイン**です。賭けるには**${totalAmountNeeded}コイン**が必要です。`)
                    .setTimestamp();
                return await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            }
            const rand = Math.random() * 100;

            let resultMessage = '';
            let coinsWon = 0;
            if (rand <= 30) {
                if (number === Math.floor(Math.random() * 4) + 1) {
                    coinsWon = amount * 2 + Math.floor(amount * 0.02);
                    resultMessage = `おめでとうございます！数字が一致しました！賭けたコインの**倍**と**2%**のコインが付与されます。`;
                } else {
                    resultMessage = '残念！数字が一致しませんでした。';
                }
            }
            else if (rand <= 35) {
                coinsWon = Math.floor(amount * 0.30);
                resultMessage = `大当たり！賭けたコインの**30%**が加算されます！`;
            }
            else if (rand <= 70) {
                coinsWon = -Math.floor(amount * 2 + amount * 0.02);
                resultMessage = `負けました！賭けたコインの**倍**と**2%**が引かれます。`;
            }
            else {
                resultMessage = '結果が引き分けとなりました。もう一度試してみましょう。';
            }
            const newCoins = row.coins - totalAmountNeeded + coinsWon;
            if (newCoins < 0) {
                const errorEmbed = new EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle('エラー')
                    .setDescription('所持金が0になったため、処理できません。')
                    .setTimestamp();
                return await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            }
            dbMoney.run('UPDATE users SET coins = ? WHERE discord_id = ?', [newCoins, userId]);
            const embed = new EmbedBuilder()
                .setColor(coinsWon >= 0 ? '#0099ff' : '#ff0000')
                .setTitle(coinsWon >= 0 ? '賭け結果' : '賭け結果')
                .setDescription(`${resultMessage}`)
                .addFields(
                    { name: '賭けたコイン数', value: `${amount}コイン`, inline: true },
                    { name: '手数料（3%）', value: `-${fee}コイン`, inline: true },
                    { name: '結果のコイン数', value: `${coinsWon >= 0 ? `+${coinsWon}コイン` : `${coinsWon}コイン`}`, inline: true },
                    { name: '現在の所持コイン数', value: `${newCoins}コイン`, inline: true }
                )
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });

        } catch (error) {
            console.error('エラー:', error);
            const errorEmbed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('エラー')
                .setDescription('賭け処理中にエラーが発生しました。')
                .setTimestamp();

            await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }
    },
};
