const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dataDir = path.resolve(__dirname, '../../db');
const userDbPath = path.resolve(dataDir, 'blacklistuser.db');
const serverDbPath = path.resolve(dataDir, 'blacklistserver.db');
const ipDbPath = path.resolve(dataDir, 'ip.db');
const reportDbPath = path.resolve(dataDir, 'report.db');

const reportDb = new sqlite3.Database(reportDbPath, (err) => {
    if (err) {
        console.error('レポートデータベース接続エラー:', err.message);
    } else {
        console.log('レポートデータベースに接続しました');
    }
});

const userDb = new sqlite3.Database(userDbPath, (err) => {
    if (err) {
        console.error('ユーザーデータベース接続エラー:', err.message);
    } else {
        console.log('ユーザーブラックリストデータベースに接続しました');
    }
});

const serverDb = new sqlite3.Database(serverDbPath, (err) => {
    if (err) {
        console.error('サーバーデータベース接続エラー:', err.message);
    } else {
        console.log('サーバーブラックリストデータベースに接続しました');
    }
});

const ipDb = new sqlite3.Database(ipDbPath, (err) => {
    if (err) {
        console.error('IPデータベース接続エラー:', err.message);
    } else {
        console.log('IPデータベースに接続しました');
    }
});

const addReportToDb = async (reportId, executorId, serverId, channelId, title, content) => {
    return new Promise((resolve, reject) => {
        const query = `
            INSERT INTO reports (report_id, executor_id, server_id, channel_id, title, content)
            VALUES (?, ?, ?, ?, ?, ?)
        `;
        reportDb.run(query, [reportId, executorId, serverId, channelId, title, content], function (err) {
            if (err) {
                return reject(err);
            }
            resolve();
        });
    });
};

const getReportToDb = async (reportId) => {
    return new Promise((resolve, reject) => {
        const query = 'SELECT * FROM reports WHERE report_id = ?';
        reportDb.get(query, [reportId], (err, row) => {
            if (err) {
                return reject(err);
            }
            resolve(row);
        });
    });
};

const removeReportToDb = async (reportId) => {
    return new Promise((resolve, reject) => {
        const query = 'DELETE FROM reports WHERE report_id = ?';
        reportDb.run(query, [reportId], function (err) {
            if (err) {
                return reject(err);
            }
            resolve();
        });
    });
};

const addUserToBlacklist = async (userId, reason) => {
    return new Promise((resolve, reject) => {
        const query = 'INSERT OR IGNORE INTO blacklist (id, reason) VALUES (?, ?)';
        userDb.run(query, [userId, reason], function (err) {
            if (err) {
                return reject(err);
            }
            resolve();
        });
    });
};

const addServerToBlacklist = async (serverId, reason) => {
    return new Promise((resolve, reject) => {
        const query = 'INSERT OR IGNORE INTO blacklist (id, reason) VALUES (?, ?)';
        serverDb.run(query, [serverId, reason], function (err) {
            if (err) {
                return reject(err);
            }
            resolve();
        });
    });
};

const getUserFromBlacklist = async (userId) => {
    return new Promise((resolve, reject) => {
        const query = 'SELECT * FROM blacklist WHERE id = ?';
        userDb.get(query, [userId], (err, row) => {
            if (err) {
                return reject(err);
            }
            resolve(row);
        });
    });
};

const getServerFromBlacklist = async (serverId) => {
    return new Promise((resolve, reject) => {
        const query = 'SELECT * FROM blacklist WHERE id = ?';
        serverDb.get(query, [serverId], (err, row) => {
            if (err) {
                return reject(err);
            }
            resolve(row);
        });
    });
};

const getAllUsersFromBlacklist = async () => {
    return new Promise((resolve, reject) => {
        const query = 'SELECT * FROM blacklist';
        userDb.all(query, [], (err, rows) => {
            if (err) {
                return reject(err);
            }
            resolve(rows);
        });
    });
};

const getAllServersFromBlacklist = async () => {
    return new Promise((resolve, reject) => {
        const query = 'SELECT * FROM blacklist';
        serverDb.all(query, [], (err, rows) => {
            if (err) {
                return reject(err);
            }
            resolve(rows);
        });
    });
};

const removeUserFromBlacklist = async (userId) => {
    return new Promise((resolve, reject) => {
        const query = 'DELETE FROM blacklist WHERE id = ?';
        userDb.run(query, [userId], function (err) {
            if (err) {
                return reject(err);
            }
            resolve();
        });
    });
};

const removeServerFromBlacklist = async (serverId) => {
    return new Promise((resolve, reject) => {
        const query = 'DELETE FROM blacklist WHERE id = ?';
        serverDb.run(query, [serverId], function (err) {
            if (err) {
                return reject(err);
            }
            resolve();
        });
    });
};

const addIpToDb = async (discordId, ipAddress) => {
    return new Promise((resolve, reject) => {
        const query = 'INSERT OR REPLACE INTO ip_addresses (discord_id, ip_address) VALUES (?, ?)';
        ipDb.run(query, [discordId, ipAddress], function (err) {
            if (err) {
                return reject(err);
            }
            resolve();
        });
    });
};

const getIpFromDb = async (discordId) => {
    return new Promise((resolve, reject) => {
        const query = 'SELECT ip_address FROM ip_addresses WHERE discord_id = ?';
        ipDb.get(query, [discordId], (err, row) => {
            if (err) {
                return reject(err);
            }
            resolve(row ? row.ip_address : null);
        });
    });
};

const removeIpToDb = async (discordId) => {
    return new Promise((resolve, reject) => {
        const query = 'DELETE FROM ip_addresses WHERE discord_id = ?';
        ipDb.run(query, [discordId], function (err) {
            if (err) {
                return reject(err);
            }
            resolve();
        });
    });
};

module.exports = {
    addUserToBlacklist,
    addServerToBlacklist,
    getUserFromBlacklist,
    getServerFromBlacklist,
    getAllUsersFromBlacklist,
    getAllServersFromBlacklist,
    removeUserFromBlacklist,
    removeServerFromBlacklist,
    addIpToDb,
    getIpFromDb,
    removeIpToDb,
    addReportToDb,
    getReportToDb,
    removeReportToDb,
};
