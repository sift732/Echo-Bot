const sqlite3 = require('sqlite3').verbose();
const dbJoin = new sqlite3.Database('db/join.db');
const dbLeave = new sqlite3.Database('db/leave.db');

module.exports = async (guild) => {
    try {
        const serverId = guild.id;
        dbJoin.run('DELETE FROM join_table WHERE server_id = ?', [serverId], (err) => {
            if (err) {
                console.error(`join.db からサーバーID ${serverId} のデータ削除エラー:`, err);
                return;
            }
            console.log(`join_table からサーバーID ${serverId} のデータを削除しました。`);
        });
        dbLeave.run('DELETE FROM leave WHERE server_id = ?', [serverId], (err) => {
            if (err) {
                console.error(`leave.db からサーバーID ${serverId} のデータ削除エラー:`, err);
                return;
            }
            console.log(`leave テーブル からサーバーID ${serverId} のデータを削除しました。`);
        });

    } catch (error) {
        console.error('GuildDelete イベント処理中にエラーが発生しました:', error);
    }
};