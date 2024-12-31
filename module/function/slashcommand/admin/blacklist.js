const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getUserFromBlacklist, getServerFromBlacklist, addUserToBlacklist, addServerToBlacklist, removeUserFromBlacklist, removeServerFromBlacklist } = require('../../../event/sqlite'); // SQLiteモジュールから必要な関数をインポート

module.exports = {
    data: new SlashCommandBuilder()
        .setName('admin_blacklist')
        .setDescription('ブラックリストの管理')
        .addStringOption(option => 
            option.setName('種類')
                .setDescription('追加または削除')
                .setRequired(true)
                .addChoices(
                    { name: '追加', value: 'add' },
                    { name: '削除', value: 'remove' }
                )
        )
        .addStringOption(option => 
            option.setName('id')
                .setDescription('サーバーIDまたはユーザーID')
                .setRequired(true)
        )
        .addStringOption(option => 
            option.setName('理由')
                .setDescription('ブラックリスト追加の理由')
                .setRequired(true)
        ),
    
    async execute(interaction) {
        const adminId = process.env.ADMIN;
        const userId = interaction.user.id;

        if (userId !== adminId) {
            return interaction.reply({ content: 'このコマンドは管理者のみ実行できます。', ephemeral: true });
        }

        const type = interaction.options.getString('種類');
        const targetId = interaction.options.getString('id');
        const reason = interaction.options.getString('理由');

        let targetServer = null;
        let targetUser = null;
        await interaction.deferReply({ ephemeral: true });

        try {
            targetServer = interaction.client.guilds.cache.get(targetId);
        } catch (err) {
            targetServer = null;
        }

        try {
            targetUser = await interaction.client.users.fetch(targetId);
        } catch (err) {
            targetUser = null;
        }
        if (!targetServer && !targetUser) {
            const notFoundEmbed = new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('エラー')
                .setDescription('指定されたサーバーIDまたはユーザーIDが見つかりません。')
                .setTimestamp();

            return interaction.editReply({ embeds: [notFoundEmbed] });
        }

        try {
            if (type === 'add') {
                if (targetUser) {
                    const userBlacklisted = await getUserFromBlacklist(targetUser.id);
                    if (userBlacklisted) {
                        return interaction.editReply({ content: 'このユーザーはすでにブラックリストに登録されています。', ephemeral: true });
                    }
                    await addUserToBlacklist(targetUser.id, reason);
                    return interaction.editReply({ content: `ユーザー ${targetUser.id} をブラックリストに追加しました。理由: ${reason}`, ephemeral: true });
                } else if (targetServer) {
                    const serverBlacklisted = await getServerFromBlacklist(targetServer.id);
                    if (serverBlacklisted) {
                        return interaction.editReply({ content: 'このサーバーはすでにブラックリストに登録されています。', ephemeral: true });
                    }
                    await addServerToBlacklist(targetServer.id, reason);
                    return interaction.editReply({ content: `サーバー ${targetServer.id} をブラックリストに追加しました。理由: ${reason}`, ephemeral: true });
                }
            } else if (type === 'remove') {
                if (targetUser) {
                    const userBlacklisted = await getUserFromBlacklist(targetUser.id);
                    if (!userBlacklisted) {
                        return interaction.editReply({ content: 'このユーザーはブラックリストに登録されていません。', ephemeral: true });
                    }
                    await removeUserFromBlacklist(targetUser.id);
                    return interaction.editReply({ content: `ユーザー ${targetUser.id} をブラックリストから削除しました。`, ephemeral: true });
                } else if (targetServer) {
                    const serverBlacklisted = await getServerFromBlacklist(targetServer.id);
                    if (!serverBlacklisted) {
                        return interaction.editReply({ content: 'このサーバーはブラックリストに登録されていません。', ephemeral: true });
                    }
                    await removeServerFromBlacklist(targetServer.id);
                    return interaction.editReply({ content: `サーバー ${targetServer.id} をブラックリストから削除しました。`, ephemeral: true });
                }
            } else {
                return interaction.editReply({ content: '無効な種類が指定されました。`追加` または `削除` を指定してください。', ephemeral: true });
            }
        } catch (error) {
            console.error('ブラックリスト処理中にエラーが発生しました:', error);
            return interaction.editReply({ content: 'ブラックリストの処理中にエラーが発生しました。', ephemeral: true });
        }
    }
};
