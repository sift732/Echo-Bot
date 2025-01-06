const { EmbedBuilder } = require('discord.js');
const sqlite3 = require('sqlite3').verbose();
const cron = require('node-cron');

const db = new sqlite3.Database('db/money.db');

module.exports = (client) => {
    cron.schedule('0 0 * * *', async () => {
        try {
            const channelId = '1325738051468656670';
            const channel = await client.channels.fetch(channelId);
            if (!channel) return;
            const getGlobalRanking = () => {
                return new Promise((resolve, reject) => {
                    db.all('SELECT discord_id, coins FROM users ORDER BY coins DESC LIMIT 10', (err, rows) => {
                        if (err) {
                            console.error('データ取得エラー:', err);
                            reject(err);
                        }
                        resolve(rows);
                    });
                });
            };

            const rankingData = await getGlobalRanking();
            if (!rankingData || rankingData.length === 0) {
                console.log('ランキングデータがありません');
                return;
            }
            const getUserName = async (userId) => {
                const user = await client.users.fetch(userId).catch(() => null);
                return user ? user.username : '不明なユーザー';
            };
            let rankingList = '';
            for (let i = 0; i < rankingData.length; i++) {
                const row = rankingData[i];
                const userName = await getUserName(row.discord_id);
                rankingList += `${i + 1}. ${userName} (${row.discord_id}) : ${row.coins} コイン\n`;
            }
            const embed = new EmbedBuilder()
                .setColor('#0099ff')
                .setTitle('今日のお金持ちランキング')
                .setDescription(rankingList)
                .setTimestamp();
            await channel.send({ embeds: [embed] });

        } catch (error) {
            console.error('ランキング送信中にエラーが発生しました:', error);
        }
    }, {
        scheduled: true,
        timezone: 'Asia/Tokyo'
    });
};