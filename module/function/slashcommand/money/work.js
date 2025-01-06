const { SlashCommandBuilder } = require('@discordjs/builders');
const { EmbedBuilder } = require('discord.js');
const sqlite3 = require('sqlite3').verbose();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('money_work')
        .setDescription('コインを稼ぎます'),

    async execute(interaction) {
        try {
            const userId = interaction.user.id;
            const db = new sqlite3.Database('db/money.db');

            const getUserData = (userId) => {
                return new Promise((resolve, reject) => {
                    db.get("SELECT coins, last_active FROM users WHERE discord_id = ?", [userId], (err, row) => {
                        if (err) {
                            console.error("データ取得エラー:", err);
                            reject(err);
                        }
                        resolve(row);
                    });
                });
            };

            const row = await getUserData(userId);
            const currentTime = new Date();
            const formattedTime = currentTime.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' });
            const currentTimeStamp = Date.now();

            if (!row) {
                const coinsEarned = Math.floor(Math.random() * (1000 - 100 + 1)) + 100;
                db.run("INSERT INTO users (discord_id, coins, last_active) VALUES (?, ?, ?)", [userId, coinsEarned, formattedTime], (err) => {
                    if (err) {
                        console.error("ユーザー作成エラー:", err);
                        return;
                    }
                });

                db.close();

                const embed = new EmbedBuilder()
                .setColor('#0099ff')
                .setTitle('初回コイン獲得')
                .setDescription(`あなたは**${coinsEarned}コイン**を獲得しました`)
                .addFields(
                    { name: '現在の所持コイン', value: `${coinsEarned}コイン` },
                    { name: '実行時間', value: formattedTime }
                )
                .setFooter('これからも頑張って働いてください')
                .setTimestamp();
            
            await interaction.reply({ embeds: [embed] });
            return;
            }
            const lastActiveTime = new Date(row.last_active).getTime();
            const elapsedTime = currentTimeStamp - lastActiveTime;

            if (elapsedTime < 780000) {
                const remainingTime = 780000 - elapsedTime;
                const remainingMinutes = Math.floor(remainingTime / 60000);
                const remainingSeconds = Math.floor((remainingTime % 60000) / 1000);

                const embed = new EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle('休憩')
                    .setDescription(`あと**${remainingMinutes}分${remainingSeconds}秒**経過したら復帰できます\n休憩は大切です`)
                    .setTimestamp();
                return interaction.reply({ embeds: [embed], ephemeral: true });
            }

            const coinsEarned = Math.floor(Math.random() * (1000 - 100 + 1)) + 100;
            const newCoins = row.coins + coinsEarned;
            db.run("UPDATE users SET coins = ?, last_active = ? WHERE discord_id = ?", [newCoins, formattedTime, userId], (err) => {
                if (err) {
                    console.error("エラー:", err);
                    return;
                }
            });

            db.close();

            const embed = new EmbedBuilder()
                .setColor('#0099ff')
                .setTitle('コイン獲得')
                .setDescription(`あなたは**${coinsEarned}コイン** を稼ぎました`)
                .addFields({ name: '現在の所持コイン数', value: `${newCoins} コイン` })
                .addFields({ name: '実行時間', value: formattedTime })
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });

        } catch (error) {
            console.error('エラー:', error);
            const errorEmbed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('エラー')
                .setDescription('情報取得中にエラーが発生しました')
                .setTimestamp();

            await interaction.reply({ embeds: [errorEmbed] });
        }
    },
};
