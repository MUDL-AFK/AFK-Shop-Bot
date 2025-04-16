const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('invites')
        .setDescription('Gets a users server invite count.')
        .addUserOption(option => 
            option.setName('user')
                .setDescription('user you want the invites of')
                .setRequired(false)),
    async execute(interaction) {
        // Command execution is handled in index.js
    },
}; 