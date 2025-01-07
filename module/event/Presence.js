module.exports = async (client) => {
    try {
        const guildCount = client.guilds.cache.size;
        const memberCount = client.users.cache.size;

        const status = {
            activities: [{ name: `${guildCount}Server：${memberCount}Members`, type: 3 },],status: 'online',};
        await client.user.setPresence(status);
        console.log('Botのステータスが設定されました:', status.activities.map(a => a.name).join(', '));
    } catch (error) {
        console.error('ステータス設定中にエラーが発生しました:', error);
    }
};
