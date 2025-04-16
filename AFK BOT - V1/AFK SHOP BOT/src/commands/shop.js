const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('shop')
        .setDescription('shop parent command')
        .addSubcommand(subcommand =>
            subcommand
                .setName('add')
                .setDescription('add an item to the shop')
                .addStringOption(option => option.setName('name').setDescription('name').setRequired(true))
                .addStringOption(option => option.setName('price').setDescription('price').setRequired(true))
                .addAttachmentOption(option => option.setName('image').setDescription('image').setRequired(true))
                .addChannelOption(option => option.setName('channel').setDescription('channel').setRequired(true))),
    async execute(interaction) {
        // Command execution is handled in index.js
    },
}; 