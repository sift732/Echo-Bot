const { SlashCommandBuilder } = require('discord.js');
const { openReportModal } = require('../../modal/report');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('user_report')
        .setDescription('ユーザーまたはサーバーに関するレポートを送信します。'),

    async execute(interaction) {
        await openReportModal(interaction);
    }
};