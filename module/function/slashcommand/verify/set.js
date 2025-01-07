const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fs = require('fs');
const verifyPath = require('../../../../json/verify.json');
const { supabase } = require('../../../event/connect');
require('dotenv').config();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('verify_set')
        .setDescription('指定されたロールで認証設定を行います。')
        .addRoleOption(option =>
            option.setName('ロール')
                .setDescription('認証後に付与するロール')
                .setRequired(true)),

    async execute(interaction) {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor('#ff0000')
                        .setAuthor({
                            name: 'エラー',
                        })
                        .setDescription('このコマンドはサーバー管理者のみ実行可能です')
                        .setTimestamp()
                ],
                ephemeral: true
            });
        }

        const channelId = interaction.channelId;
        const role = interaction.options.getRole('ロール');
        const roleId = role.id;
        const roleName = role.name;
        const serverId = interaction.guild.id;

        let verifyData = {};
        try {
            if (fs.existsSync(verifyPath)) {
                const fileData = fs.readFileSync(verifyPath, 'utf8');
                verifyData = fileData ? JSON.parse(fileData) : {};
            }
        } catch (error) {
            console.error('JSONパースエラー:', error);
        }

        if (!Array.isArray(verifyData[serverId])) {
            verifyData[serverId] = [];
        }

        const existingIndex = verifyData[serverId].findIndex(config => config.channelId === channelId);

        if (existingIndex > -1) {
            verifyData[serverId][existingIndex] = { channelId, roleId };
        } else {
            verifyData[serverId].push({ channelId, roleId });
        }

        fs.writeFileSync(verifyPath, JSON.stringify(verifyData, null, 2));

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('verify_button')
                    .setLabel('認証する')
                    .setStyle(ButtonStyle.Primary)
            );

        await interaction.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor('#00ff00')
                    .setAuthor({
                        name: '認証設定が完了しました',
                    })
                    .setDescription(`以下のボタンを押して認証を行ってください。\n付与されるロール：<@&${roleId}>`)
                    .setTimestamp()
            ],
            components: [row]
        });
    },

    async handleVerifyButton (interaction) {
        if (interaction.customId !== 'verify_button') return;

        await interaction.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor('#ffff00')
                    .setAuthor({
                        name: '確認中',
                    })
                    .setDescription('認証状態を確認しています...')
                    .setTimestamp()
            ],
            ephemeral: true
        });

        let verifyData = {};
        try {
            if (fs.existsSync(verifyPath)) {
                const fileData = fs.readFileSync(verifyPath, 'utf8');
                verifyData = fileData ? JSON.parse(fileData) : {};
            }
        } catch (error) {
            console.error('JSONパースエラー:', error);
        }

        const serverId = interaction.guild.id;

        if (!Array.isArray(verifyData[serverId]) || verifyData[serverId].length === 0) {
            return interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setColor('#ff0000')
                        .setAuthor({
                            name: 'エラー',
                        })
                        .setDescription('認証設定情報が見つかりません。管理者権限を持つユーザーに問い合わせてください')
                        .setTimestamp()
                ],
                components: []
            });
        }

        const channelId = interaction.channelId;
        const currentConfig = verifyData[serverId].find(config => config.channelId === channelId);

        if (!currentConfig) {
            return interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setColor('#ff0000')
                        .setAuthor({
                            name: 'エラー',
                        })
                        .setDescription('このチャンネルには認証設定がありません')
                        .setTimestamp()
                ],
                components: []
            });
        }

        const { roleId } = currentConfig;

        const role = interaction.guild.roles.cache.get(roleId);
        const roleName = role ? role.toString() : '不明なロール';

        if (role && interaction.guild.members.me.roles.highest.comparePositionTo(role) <= 0) {
            return interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setColor('#ff0000')
                        .setAuthor({
                            name: 'エラー',
                        })
                        .setDescription('指定されたロールがBotの権限より上に設定されています\n設定者のユーザーに問い合わせてください')
                        .setTimestamp()
                ],
                components: []
            });
        }

        const { data: userData, error: userError } = await supabase
            .from('users')
            .select('discord_id')
            .eq('discord_id', interaction.user.id)
            .single();

        if (userError || !userData) {
            const authLinkEmbed = new EmbedBuilder()
                .setColor('#ff0000')
                .setAuthor({
                    name: '認証が必要です',
                })
                .setDescription('認証を完了するには以下のリンクをクリックしてください')
                .setTimestamp();

            const authButton = new ButtonBuilder()
                .setLabel('認証リンク')
                .setURL('https://echo-bot-page.glitch.me/index.html?page=auth')
                .setStyle(ButtonStyle.Link);

            const authRow = new ActionRowBuilder()
                .addComponents(authButton);

            await interaction.editReply({
                embeds: [authLinkEmbed],
                components: [authRow]
            });
        } else {
            const member = interaction.guild.members.cache.get(interaction.user.id);
            if (member.roles.cache.has(roleId)) {
                await interaction.editReply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor('#00ff00')
                            .setAuthor({
                                name: '認証済み',
                            })
                            .setDescription(`認証状態が確認できました\nロール：${roleName} が付与されているか確認してください`)
                            .setTimestamp()
                    ],
                    components: []
                });
            } else {
                await member.roles.add(roleId);

                await interaction.editReply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor('#00ff00')
                            .setAuthor({
                                name: '認証済み',
                            })
                            .setDescription(`認証が完了しました。\nロール：${roleName} が付与されました`)
                            .setTimestamp()
                    ],
                    components: []
                });
            }
        }
    }
};
