const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('order')
        .setDescription('create a ticket and order')
        .addStringOption(option => 
            option.setName('ign')
                .setDescription('your in game name')
                .setRequired(true)),
    async execute(interaction) {
        // Command execution is handled in index.js
    },
}; 