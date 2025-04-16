const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('cart')
        .setDescription('view your cart'),
    async execute(interaction) {
        // Command execution is handled in index.js
    },
}; 