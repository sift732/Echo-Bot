const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { WebhookClient } = require('discord.js');
const sqlite3 = require('sqlite3').verbose();
const { supabase } = require('../connect');
const fs = require('fs');
const { getUserFromBlacklist, getServerFromBlacklist } = require('../../event/sqlite');

const dbGlobal = new sqlite3.Database('db/setting.db');

module.exports = {
    name: 'messageCreate',
    async execute(message) {
        if (message.author.bot) return;

        const userId = message.author.id;
        const serverId = message.guild.id;

        try {
            const userBlacklisted = await getUserFromBlacklist(userId);
            const serverBlacklisted = await getServerFromBlacklist(serverId);

            if (userBlacklisted) {
                console.log(`ブラックリストに登録されたユーザーが検出されました：${userId}`);
                return await message.reply('あなたはグローバルチャットの利用を禁止されています');
            }

            if (serverBlacklisted) {
                console.log(`ブラックリストに登録されたサーバーが検出されました：${serverId}`);
                return await message.channel.send('このサーバーはECHO-BOTグローバルチャットの利用を禁止されています');
            }
        } catch (err) {
            console.error('ブラックリストチェック中にエラーが発生しました:', err);
            return;
        }

        const { data: userData, error: userError } = await supabase
            .from('users')
            .select('*')
            .eq('discord_id', userId)
            .single();

        if (userError || !userData) {
            const authButton = new ButtonBuilder()
                .setLabel('認証を完了する')
                .setStyle(ButtonStyle.Link)
                .setURL('https://echo-bot-page.glitch.me/index.html?page=auth');

            const row = new ActionRowBuilder().addComponents(authButton);

            await message.react('❌');
            return message.reply({ content: 'グローバルチャットを利用するには認証が必要です。認証を完了してください。', components: [row] });
        }

        const ngWords = JSON.parse(fs.readFileSync('json/ngword.json', 'utf8'));
        const messageContent = message.content;
        const isBlocked = ngWords.some(ngWord => {
            const exactMatch = new RegExp(`^${ngWord}$`, 'i').test(messageContent);
            const includes = messageContent.toLowerCase().includes(ngWord.toLowerCase());
            const endsWith = messageContent.toLowerCase().endsWith(ngWord.toLowerCase());
            const startsWith = messageContent.toLowerCase().startsWith(ngWord.toLowerCase());
            return exactMatch || includes || endsWith || startsWith;
        });

        if (isBlocked) {
            return await console.log('NGワード検出');
        }

        dbGlobal.all('SELECT * FROM settings', async (err, rows) => {
            if (err) {
                console.error('データベースエラー:', err);
                return;
            }
            const isChannelRegistered = rows.some(row => row.channel_id === message.channel.id);

            if (!isChannelRegistered) {
                return await console.log('グロチャ未登録');
            }

            if (rows.length === 0) {
                console.log('グローバルチャット登録なし');
                return;
            }

            let description = message.content || 'メッセージがありません。';
            let imageUrl = null;
            let videoUrl = null;

            if (message.attachments.size > 0) {
                const attachment = message.attachments.first();
                if (attachment.contentType.startsWith('image')) {
                    imageUrl = attachment.url;
                } else if (attachment.contentType.startsWith('video')) {
                    videoUrl = attachment.url;
                } else {
                    description = attachment.url;
                }
            }

            const embed = new EmbedBuilder()
                .setColor('#0099ff')
                .setAuthor({
                    name: `${message.author.tag} (${message.author.id})`,
                    iconURL: message.author.displayAvatarURL({ dynamic: true }),
                })
                .setDescription(description)
                .setFooter({
                    text: `${message.guild.name} (${message.guild.id})`,
                    iconURL: message.guild.iconURL({ dynamic: true }),
                })
                .setTimestamp();
            if (imageUrl) {
                embed.setImage(imageUrl);
            }
            if (videoUrl) {
                embed.setDescription(`[クリックしてファイルを見る](${videoUrl})`);
            }

            let sentCount = 0;
            for (const row of rows) {
                if (row.channel_id === message.channel.id) continue;

                try {
                    const webhookClient = new WebhookClient({ url: row.webhook_url });
                    await webhookClient.send({ embeds: [embed] });
                    sentCount++;
                } catch (err) {
                    console.error('Webhook送信エラー:', err);
                }
            }

            if (sentCount > 0) {
                await message.react('🌎');
            } else {
                await message.react('❌');
            }
        });
    },
};
