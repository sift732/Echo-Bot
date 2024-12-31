const { EmbedBuilder, ButtonBuilder, ActionRowBuilder } = require('discord.js');
const { handleInteraction } = require('../function/slashcommand/verify/set');
const { handleReportSubmit } = require('../function/modal/report');
const { handleButtonInteraction } = require('../function/button/report');
const { getUserFromBlacklist, getServerFromBlacklist } = require('../event/sqlite');
const { handleWarnModalSubmit, handleWarnButton } = require('../function/modal/select');
const { handleMuteModalSubmit } = require('../function/modal/mute');
const { handleMuteButton } = require('../function/modal/mute');
const { supabase } = require('./connect');

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
                .setStyle('Link')
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
    if (interaction.isCommand()) {
        const command = client.commands.get(interaction.commandName);
        if (!command) return;
        await command.execute(interaction);
    }

    if (interaction.isModalSubmit()) {
        if (interaction.customId === 'warn_modal') {
            await handleWarnModalSubmit(interaction);
        } else {
            await handleMuteModalSubmit(interaction);
            await handleReportSubmit(interaction);
        }
    }

    if (interaction.isButton()) {
        const validCustomIds = [
            'verify_button', 'report_discard', 'report_warn', 
            'report_mute', 'warn_user', 'warn_server'
        ];
        if (validCustomIds.includes(interaction.customId)) {
            switch (interaction.customId) {
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
        } else {
            await handleInteraction(interaction);
        }
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
        .setStyle('Link')
        .setURL(process.env.SUPPORT);

    const row = new ActionRowBuilder().addComponents(supportButton);

    if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ embeds: [errorEmbed], components: [row] });
    } else {
        await interaction.reply({ embeds: [errorEmbed], components: [row] });
    }
}
