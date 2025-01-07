const { addIpToDb } = require('../../../module/event/sqlite');
const { supabase } = require('../.././event/connect');
const { EmbedBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');

const handleMuteButton = async (interaction) => {
    try {
        if (!interaction.isButton() || interaction.customId !== 'report_mute') return;

        const modal = new ModalBuilder()
            .setCustomId('mute_modal')
            .setTitle('ミュート理由を入力');

        const userIdInput = new TextInputBuilder()
            .setCustomId('mute_user_id')
            .setLabel('ユーザーID')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        const reasonInput = new TextInputBuilder()
            .setCustomId('mute_reason')
            .setLabel('理由')
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true);

        const row1 = new ActionRowBuilder().addComponents(userIdInput);
        const row2 = new ActionRowBuilder().addComponents(reasonInput);

        modal.addComponents(row1, row2);

        await interaction.showModal(modal);
    } catch (error) {
        console.error('エラーハンドリング中に例外が発生しました:', error);
        const errorEmbed = new EmbedBuilder()
            .setColor('Red')
            .setTitle('エラー')
            .setDescription('処理中にエラーが発生しました。')
            .setTimestamp();
        await interaction.reply({
            embeds: [errorEmbed],
            ephemeral: true,
        });
    }
};

const handleMuteModalSubmit = async (interaction) => {
    try {
        if (!interaction.isModalSubmit() || interaction.customId !== 'mute_modal') return;

        const userId = interaction.fields.getTextInputValue('mute_user_id');
        const reason = interaction.fields.getTextInputValue('mute_reason');
        const { data, error } = await supabase
            .from('users')
            .select('ip_address')
            .eq('discord_id', userId)
            .single();

        if (error || !data) {
            console.error('Supabaseエラー:', error || 'データが見つかりませんでした');
            const errorEmbed = new EmbedBuilder()
                .setColor('Red')
                .setTitle('エラー')
                .setDescription('データベースに指定されたユーザーIDのデータが見つかりませんでした。')
                .setTimestamp();
            await interaction.reply({
                embeds: [errorEmbed],
                ephemeral: true,
            });
            return;
        }

        const ipAddress = data.ip_address;
        const dbResult = await addIpToDb(userId, ipAddress);

        if (dbResult && dbResult.error) {
            if (dbResult.error.message.includes('UNIQUE constraint failed')) {
                const existsEmbed = new EmbedBuilder()
                    .setColor('Yellow')
                    .setTitle('既存のデータ')
                    .setDescription('指定されたユーザーのIPアドレスはすでに保存されています。')
                    .setTimestamp();
                await interaction.reply({
                    embeds: [existsEmbed],
                    ephemeral: true,
                });
            } else {
                console.error('SQLiteエラー:', dbResult.error);
                const errorEmbed = new EmbedBuilder()
                    .setColor('Red')
                    .setTitle('エラー')
                    .setDescription('IPアドレスの保存中にエラーが発生しました。')
                    .setTimestamp();
                await interaction.reply({
                    embeds: [errorEmbed],
                    ephemeral: true,
                });
            }
            return;
        }

        const successEmbed = new EmbedBuilder()
            .setColor('Green')
            .setTitle('ミュート処理成功')
            .setDescription(`指定されたユーザーのIPアドレスを保存しました。\n**ユーザーID:** ${userId}\n**理由:** ${reason}`)
            .addFields({ name: 'IPアドレス', value: ipAddress })
            .setTimestamp();

        await interaction.reply({
            embeds: [successEmbed],
            ephemeral: true,
        });
    } catch (error) {
        console.error('エラーハンドリング中に例外が発生しました:', error);
        const errorEmbed = new EmbedBuilder()
            .setColor('Red')
            .setTitle('エラー')
            .setDescription('処理中にエラーが発生しました。')
            .setTimestamp();
        await interaction.reply({
            embeds: [errorEmbed],
            ephemeral: true,
        });
    }
};

module.exports = {
    handleMuteButton,
    handleMuteModalSubmit
};