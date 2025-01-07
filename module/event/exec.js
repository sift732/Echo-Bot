const { EmbedBuilder, ButtonBuilder, ActionRowBuilder, ButtonStyle, WebhookClient } = require('discord.js');
const { handleVerifyButton } = require('../function/slashcommand/verify/set'); 
const { handleReportSubmit } = require('../function/modal/report');
const { handleButtonInteraction } = require('../function/button/report');
const { getUserFromBlacklist, getServerFromBlacklist } = require('../event/sqlite');
const { handleWarnModalSubmit, handleWarnButton } = require('../function/modal/select');
const { handleMuteModalSubmit, handleMuteButton } = require('../function/modal/mute');
const { supabase } = require('./connect');

const historyWebhookUrl = process.env.HISTORYWEBHOOK;

module.exports = (client) => {
    client.on('interactionCreate', async (interaction) => {
        try {
            const adminId = process.env.ADMIN;
            const userId = interaction.user.id;
            if (userId === adminId) {
                await processInteraction(client, interaction);
                return;
            }

            const isBlacklisted = await checkBlacklist(interaction);
            if (isBlacklisted) {
                await notifyBlacklisted(interaction);
                return;
            }

            const needsAuth = await promptUserForAuth(interaction);
            if (needsAuth) return;

            await processInteraction(client, interaction);
        } catch (error) {
            console.error(error);
            await handleError(interaction, error);
        }
    });
};

async function checkBlacklist(interaction) {
    const userId = interaction.user.id;
    const guildId = interaction.guild?.id;

    try {
        const userBlacklisted = await getUserFromBlacklist(userId);
        const serverBlacklisted = guildId ? await getServerFromBlacklist(guildId) : null;
        return userBlacklisted || serverBlacklisted;
    } catch (error) {
        console.error('ブラックリスト確認中のエラー:', error);
        return false;
    }
}

async function notifyBlacklisted(interaction) {
    const userId = interaction.user.id;
    const guildId = interaction.guild?.id;

    try {
        const userBlacklisted = await getUserFromBlacklist(userId);
        const serverBlacklisted = guildId ? await getServerFromBlacklist(guildId) : null;

        let reason = userBlacklisted?.reason || serverBlacklisted?.reason || '理由は不明です。';

        const blacklistEmbed = new EmbedBuilder()
            .setColor('Red')
            .setTitle('コマンドを実行できません')
            .setDescription('あなたまたはこのサーバーはブラックリストに登録されているため、コマンドを実行できません。')
            .addFields({ name: '理由', value: reason })
            .setTimestamp();

        if (interaction.replied || interaction.deferred) {
            await interaction.followUp({ embeds: [blacklistEmbed], ephemeral: true });
        } else {
            await interaction.reply({ embeds: [blacklistEmbed], ephemeral: true });
        }
    } catch (error) {
        console.error('ブラックリスト通知中にエラーが発生しました:', error);
        const fallbackEmbed = new EmbedBuilder()
            .setColor('Red')
            .setTitle('コマンドを実行できません')
            .setDescription('ブラックリストに登録されているため、コマンドを実行できません。理由を取得できませんでした。')
            .setTimestamp();

        if (interaction.replied || interaction.deferred) {
            await interaction.followUp({ embeds: [fallbackEmbed], ephemeral: true });
        } else {
            await interaction.reply({ embeds: [fallbackEmbed], ephemeral: true });
        }
    }
}

async function promptUserForAuth(interaction) {
    try {
        const { data, error } = await supabase
            .from('users')
            .select('discord_id')
            .eq('discord_id', interaction.user.id)
            .limit(1);

        if (error) {
            console.error('Supabaseのユーザー取得エラー:', error);
            return false;
        }

        if (data.length === 0) {
            console.log("ユーザーが見つかりませんでした");
            const authEmbed = new EmbedBuilder()
                .setColor('Blue')
                .setTitle('認証が必要です')
                .setDescription('このコマンドを実行するには、認証が必要です。下記のリンクから認証を行ってください。')
                .setTimestamp();

            const authButton = new ButtonBuilder()
                .setLabel('認証する')
                .setStyle(ButtonStyle.Link)
                .setURL('https://echo-bot-page.glitch.me/index.html?page=auth');

            const row = new ActionRowBuilder().addComponents(authButton);

            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ embeds: [authEmbed], components: [row], ephemeral: true });
            } else {
                await interaction.reply({ embeds: [authEmbed], components: [row], ephemeral: true });
            }

            return true;
        }

        return false;
    } catch (error) {
        console.error('Supabaseでのユーザー確認中にエラーが発生しました:', error);
        const errorEmbed = new EmbedBuilder()
            .setColor('Red')
            .setTitle('認証エラー')
            .setDescription('認証情報を確認中にエラーが発生しました。管理者にお問い合わせください。')
            .setTimestamp();

        if (interaction.replied || interaction.deferred) {
            await interaction.followUp({ embeds: [errorEmbed], ephemeral: true });
        } else {
            await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }

        return false;
    }
}

async function processInteraction(client, interaction) {
    if (interaction.isButton()) {
        const adminId = process.env.ADMIN;
        const userId = interaction.user.id;
        const validAdminButtonIds = [
            'report_discard', 
            'report_warn', 
            'report_mute', 
            'warn_user', 
            'warn_server'
        ];
        if (validAdminButtonIds.includes(interaction.customId)) {
            if (userId !== adminId) {
                const warningEmbed = new EmbedBuilder()
                    .setColor('Red')
                    .setTitle('権限エラー')
                    .setDescription('この操作は製作者のみ許可されています。')
                    .setTimestamp();

                await logHistory(interaction, '権限エラー');

                if (!interaction.replied && !interaction.deferred) {
                    await interaction.reply({ embeds: [warningEmbed], ephemeral: true });
                } else {
                    await interaction.followUp({ embeds: [warningEmbed], ephemeral: true });
                }
                return;
            }
        }

        await logHistory(interaction, 'ボタン');
        switch (interaction.customId) {
            case 'verify_button':
                await handleVerifyButton(interaction);
                break;
            case 'warn_user':
            case 'warn_server':
                await handleWarnButton(interaction);
                break;
            case 'report_mute':
                await handleMuteButton(interaction);
                break;
            default:
                await handleButtonInteraction(interaction);
        }
    }

    if (interaction.isCommand()) {
        const command = client.commands.get(interaction.commandName);
        if (!command) return;

        await logHistory(interaction, 'コマンド');
        await command.execute(interaction);
    }

    if (interaction.isModalSubmit()) {
        await logHistory(interaction, 'モーダル');
        if (interaction.customId === 'warn_modal') {
            await handleWarnModalSubmit(interaction);
        } else {
            await handleMuteModalSubmit(interaction);
            await handleReportSubmit(interaction);
        }
    }
}

async function logHistory(interaction, type) {
    if (!historyWebhookUrl) return;

    const webhookClient = new WebhookClient({ url: historyWebhookUrl });
    const user = interaction.user;
    const guild = interaction.guild;
    const channel = interaction.channel;

    const embed = new EmbedBuilder()
        .setColor(type === '権限エラー' ? 'Red' : '#0099ff')
        .setTitle('インタラクション履歴')
        .addFields(
            { name: 'ユーザー名', value: `\`${user.tag}\``, inline: false },
            { name: 'サーバー名', value: `\`${guild ? guild.name : 'DM'}\``, inline: false },
            { name: '実行元チャンネル名', value: `\`${channel ? channel.name : 'DM'}\``, inline: false },
            { name: 'インタラクションタイプ', value: `\`${type}\``, inline: false },
            { name: 'インタラクションした名前', value: `\`${interaction.commandName || interaction.customId}\``, inline: false }
        )
        .setTimestamp();

    if (interaction.options && interaction.options.data.length > 0) {
        const options = interaction.options.data
            .map(option => `\`${option.name}\`: \`${option.value}\``)
            .join('\n');
        embed.addFields({ name: 'オプション', value: options, inline: false });
    }
    if (type === '権限エラー') {
        embed.addFields(
            { name: 'エラータイプ', value: '`権限エラー`', inline: false }
        );
    }

    embed.addFields(
        { name: '実行者ID', value: `\`${user.id}\``, inline: true },
        { name: 'サーバーID', value: `\`${guild ? guild.id : 'DM'}\``, inline: true },
        { name: 'チャンネルID', value: `\`${channel ? channel.id : 'DM'}\``, inline: true }
    );

    try {
        await webhookClient.send({ embeds: [embed] });
    } catch (error) {
        console.error('履歴送信中にエラーが発生しました:', error);
    }
}

async function handleError(interaction, error) {
    const errorEmbed = new EmbedBuilder()
        .setColor('Red')
        .setTitle('コマンド実行中にエラーが発生しました')
        .setDescription(`\`\`\`javascript\n${error.stack || error.message || error}\n\`\`\``)
        .setTimestamp();

    const supportButton = new ButtonBuilder()
        .setLabel('サポートサーバー')
        .setStyle(ButtonStyle.Link)
        .setURL(process.env.SUPPORT);

    const row = new ActionRowBuilder().addComponents(supportButton);

    if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ embeds: [errorEmbed], components: [row], ephemeral: true });
    } else {
        await interaction.reply({ embeds: [errorEmbed], components: [row], ephemeral: true });
    }
}
