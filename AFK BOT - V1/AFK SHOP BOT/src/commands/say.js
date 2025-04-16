const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('say')
    .setDescription('Make the bot say something')
    .addStringOption(option =>
      option.setName('message')
        .setDescription('The message you want the bot to say')
        .setRequired(true))
    .addChannelOption(option =>
      option.setName('channel')
        .setDescription('The channel to send the message to (defaults to current channel)')
        .setRequired(false))
    .addBooleanOption(option =>
      option.setName('embed')
        .setDescription('Whether to send the message as an embed')
        .setRequired(false))
    .addAttachmentOption(option =>
      option.setName('image')
        .setDescription('An image to include with the message')
        .setRequired(false)),
  async execute(interaction) {
    // Command execution is handled in index.js
  },
}; 