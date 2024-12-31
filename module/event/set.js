const fs = require('fs');
const path = require('path');
const { REST, Routes } = require('discord.js');

module.exports = async (client) => {
    const commands = [];
    client.commands = new Map();
    const commandFolders = [
        'example',
        'user',
        'music',
        'verify',
        'admin'
    ];

    for (const folder of commandFolders) {
        const folderPath = path.join(__dirname, '../function/slashcommand', folder);

        if (fs.existsSync(folderPath)) {
            const commandFiles = fs
                .readdirSync(folderPath)
                .filter((file) => file.endsWith('.js'));

            for (const file of commandFiles) {
                const command = require(path.join(folderPath, file));
                commands.push(command.data.toJSON());
                client.commands.set(command.data.name, command);
            }
        } else {
            console.warn(`[警告]："${folder}"のフォルダが見つかりません`);
        }
    }

    const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

    try {
        console.log('(/)スラッシュコマンドの更新を開始しました');

        await rest.put(
            Routes.applicationCommands(client.user.id),
            { body: commands }
        );

        console.log('(/)スラッシュコマンドの更新が完了しグローバル同期されました');
    } catch (error) {
        console.error(error);
    }
};
