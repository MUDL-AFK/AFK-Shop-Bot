const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('wipe-cart')
        .setDescription('remove every item from your cart'),
    async execute(interaction) {
        // Command execution is handled in index.js
    },
}; 