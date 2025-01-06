const { SlashCommandBuilder } = require('discord.js');
const { EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('server_clear')
        .setDescription('指定された数のメッセージを削除します')
        .addIntegerOption(option =>
            option.setName('削除数')
                .setDescription('削除するメッセージの数')
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(100)
        ),
    async execute(interaction) {
        const number = interaction.options.getInteger('削除数');
        const channel = interaction.channel;
        let deletedMessagesCount = 0;
        const totalToDelete = Math.min(number, 100);

        try {
            await interaction.reply('メッセージの削除を開始します...');
            while (deletedMessagesCount < totalToDelete) {
                const deleteCount = Math.min(100, totalToDelete - deletedMessagesCount);
                const messages = await channel.messages.fetch({ limit: deleteCount });
                const messagesToDelete = messages.filter(msg => msg.id !== interaction.id);

                if (messagesToDelete.size > 0) {
                    const deleted = await channel.bulkDelete(messagesToDelete, true);
                    deletedMessagesCount += deleted.size;
                }

                if (messagesToDelete.size === 0) break;
            }
            const successEmbed = new EmbedBuilder()
                .setColor('#00ff00')
                .setTitle('削除完了')
                .setDescription(`${deletedMessagesCount} 件のメッセージを削除しました。`)
                .setTimestamp();
            await interaction.followUp({ embeds: [successEmbed] });
            setTimeout(async () => {
                const messages = await interaction.channel.messages.fetch();
                const messageToDelete = messages.find(msg => msg.embeds.length > 0 && msg.embeds[0].title === '削除完了');
                if (messageToDelete) {
                    await messageToDelete.delete();
                }
            }, 3000);

        } catch (error) {
            console.error('メッセージ削除中にエラーが発生しました:', error);
            const errorEmbed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('エラー')
                .setDescription('メッセージの削除中にエラーが発生しました。')
                .setTimestamp();
            await interaction.followUp({ embeds: [errorEmbed] });
        }
    }
};
