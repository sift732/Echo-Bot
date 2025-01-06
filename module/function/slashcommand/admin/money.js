const { SlashCommandBuilder } = require('@discordjs/builders');
const { EmbedBuilder } = require('discord.js');
const sqlite3 = require('sqlite3').verbose();

const dbMoney = new sqlite3.Database('db/money.db');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('admin_money')
        .setDescription('特定のユーザーまたはすべてのユーザーにコインを付与または剥奪します')
        .addStringOption(option =>
            option.setName('操作')
                .setDescription('付与または剥奪を選択')
                .setRequired(true)
                .addChoices(
                    { name: '付与', value: 'add' },
                    { name: '剥奪', value: 'remove' }
                ))
        .addStringOption(option =>
            option.setName('対象')
                .setDescription('特定のユーザーまたはすべてのユーザーを指定')
                .setRequired(true)
                .addChoices(
                    { name: '特定のユーザー', value: 'specific' },
                    { name: 'すべてのユーザー', value: 'all' }
                ))
        .addIntegerOption(option =>
            option.setName('コイン')
                .setDescription('付与または剥奪するコイン数')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('ユーザーid')
                .setDescription('ユーザーIDを指定（すべてのユーザーの場合は省略可）')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('理由')
                .setDescription('理由（すべてのユーザーの場合のみ必要）')
                .setRequired(false)),

    async execute(interaction) {
        try {
            const adminId = process.env.ADMIN;
            if (interaction.user.id !== adminId) {
                const errorEmbed = new EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle('エラー')
                    .setDescription('このコマンドは製作者のみ実行できます。')
                    .setTimestamp();
                return await interaction.reply({ embeds: [errorEmbed] });
            }

            const operation = interaction.options.getString('操作');
            const target = interaction.options.getString('対象');
            const userIdInput = interaction.options.getString('ユーザーid');
            const amount = interaction.options.getInteger('コイン');
            const reason = interaction.options.getString('理由') || '指定なし';

            if (target === 'all' && !reason) {
                const errorEmbed = new EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle('エラー')
                    .setDescription('すべてのユーザーに操作を行う場合、理由が必要です')
                    .setTimestamp();
                return await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            }

            const processingEmbed = new EmbedBuilder()
                .setColor('#ffaa00')
                .setTitle('処理中...')
                .setDescription(`現在、**${target === 'all' ? 'すべてのユーザー' : '特定のユーザー'}** へ、またはから **${amount}コイン** を${operation === 'add' ? '付与' : '剥奪'}しています`)
                .setTimestamp();

            await interaction.reply({ embeds: [processingEmbed], ephemeral: true });

            if (target === 'specific' && userIdInput) {
                const getUserData = (userIdInput) => {
                    return new Promise((resolve, reject) => {
                        dbMoney.get('SELECT coins FROM users WHERE discord_id = ?', [userIdInput], (err, row) => {
                            if (err) {
                                console.error('データ取得エラー:', err);
                                reject(err);
                            }
                            resolve(row);
                        });
                    });
                };

                const userData = await getUserData(userIdInput);
                if (!userData) {
                    const errorEmbed = new EmbedBuilder()
                        .setColor('#ff0000')
                        .setTitle('エラー')
                        .setDescription(`指定されたユーザーID **${userIdInput}** は存在しません。`)
                        .setTimestamp();
                    return await interaction.editReply({ embeds: [errorEmbed], ephemeral: true });
                }

                const finalAmount = operation === 'add'
                    ? userData.coins + amount
                    : Math.max(userData.coins - amount, 0);

                const updatedAmount = operation === 'add'
                    ? amount
                    : userData.coins - finalAmount;

                dbMoney.run('UPDATE users SET coins = ? WHERE discord_id = ?', [finalAmount, userIdInput]);
                try {
                    const user = await interaction.client.users.fetch(userIdInput);
                    const dmEmbed = new EmbedBuilder()
                        .setColor('#0099ff')
                        .setTitle('コイン通知')
                        .setDescription(`あなたに **${updatedAmount}コイン** が${operation === 'add' ? '付与' : '剥奪'}されました。`)
                        .addFields(
                            { name: '理由', value: reason },
                            { name: '現在のコイン数', value: `${finalAmount}コイン` }
                        )
                        .setTimestamp();

                    await user.send({ embeds: [dmEmbed] });
                } catch (dmError) {
                    console.error('DM送信エラー：', dmError);
                }

                const successEmbed = new EmbedBuilder()
                    .setColor('#0099ff')
                    .setTitle('成功')
                    .setDescription(`**${userIdInput}** ユーザーへ、またはから **${updatedAmount}コイン** を${operation === 'add' ? '付与' : '剥奪'}しました。`)
                    .setTimestamp();

                await interaction.editReply({ embeds: [successEmbed] });

            } else if (target === 'all' && reason) {
                const getAllUsers = () => {
                    return new Promise((resolve, reject) => {
                        dbMoney.all('SELECT discord_id, coins FROM users', (err, rows) => {
                            if (err) {
                                console.error('データ取得エラー:', err);
                                reject(err);
                            }
                            resolve(rows);
                        });
                    });
                };

                const users = await getAllUsers();
                if (users.length === 0) {
                    const errorEmbed = new EmbedBuilder()
                        .setColor('#ff0000')
                        .setTitle('エラー')
                        .setDescription('データベースにユーザーが存在しません。')
                        .setTimestamp();
                    return await interaction.editReply({ embeds: [errorEmbed] });
                }

                for (const user of users) {
                    const finalAmount = operation === 'add'
                        ? user.coins + amount
                        : Math.max(user.coins - amount, 0);

                    dbMoney.run('UPDATE users SET coins = ? WHERE discord_id = ?', [finalAmount, user.discord_id]);
                    try {
                        const discordUser = await interaction.client.users.fetch(user.discord_id);
                        const dmEmbed = new EmbedBuilder()
                            .setColor('#0099ff')
                            .setTitle('コイン通知')
                            .setDescription(`あなたに **${amount}コイン** が${operation === 'add' ? '付与' : '剥奪'}されました。`)
                            .addFields(
                                { name: '理由', value: reason },
                                { name: '現在のコイン数', value: `${finalAmount}コイン` }
                            )
                            .setTimestamp();

                        await discordUser.send({ embeds: [dmEmbed] });
                    } catch (dmError) {
                        console.error(`ユーザーID：${user.discord_id} のDM送信エラー:`, dmError);
                    }
                }

                const successEmbed = new EmbedBuilder()
                    .setColor('#0099ff')
                    .setTitle('成功')
                    .setDescription(`すべてのユーザーにへ、またはから **${amount}コイン** を${operation === 'add' ? '付与' : '剥奪'}しました。理由: ${reason}`)
                    .setTimestamp();

                await interaction.editReply({ embeds: [successEmbed] });
            }

        } catch (error) {
            console.error('エラー:', error);
            const errorEmbed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('エラー')
                .setDescription('コマンド処理中にエラーが発生しました。')
                .setTimestamp();

            await interaction.editReply({ embeds: [errorEmbed] });
        }
    },
};
