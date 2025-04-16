const fs = require("fs");
const { promises: fsPromises } = require("fs");
const path = require('path');

// Create necessary directories
const dataDir = path.join(__dirname, '..', 'data');
const activeTicketsDir = path.join(dataDir, 'active_tickets');
const cartsDir = path.join(dataDir, 'carts');

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir);
}
if (!fs.existsSync(activeTicketsDir)) {
  fs.mkdirSync(activeTicketsDir);
}
if (!fs.existsSync(cartsDir)) {
  fs.mkdirSync(cartsDir);
}

const config = JSON.parse(fs.readFileSync("./config.json", "utf-8"));
const { 
    Client,
    IntentsBitField,
    ActivityType,
    EmbedBuilder,
    ButtonBuilder,
    ButtonStyle,
    ActionRowBuilder,
    ComponentType,
    PermissionsBitField,
    Embed,
    ChannelType,
    PermissionFlagsBits,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    AttachmentBuilder,
} = require('discord.js');

const client = new Client({
    intents: [
        IntentsBitField.Flags.Guilds,
        IntentsBitField.Flags.GuildMembers,
        IntentsBitField.Flags.GuildMessages,
        IntentsBitField.Flags.MessageContent,
    ]
});

const activeOrders = new Map();
const activeTicketsPath = path.join(__dirname, '..', 'data', 'active_tickets');

client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}`)
    client.user.setStatus('idle');
    client.user.setActivity(config.statusMessage, { type: ActivityType.Playing });
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isCommand()) return;

  const { commandName, options } = interaction;

  try {
    if (commandName === 'shop') {
      if (interaction.options.getSubcommand() === 'add') {
        const member = interaction.guild.members.cache.get(interaction.user.id);
        const allowedUserIds = ['1346677527254405153', '1187182189931135076']; // Add more IDs as needed
        if (member && member.roles.cache.has(config.ownerId) || allowedUserIds.includes(interaction.user.id)) {
          const name = options.getString('name');
          let price = options.getString('price');
          
          // Ensure price is properly formatted
          price = price.replace('$', ''); // Remove $ if present
          const numericPrice = parseFloat(price);
          if (isNaN(numericPrice)) {
            const embed = new EmbedBuilder()
              .setColor(config.errorColor)
              .setTitle('Error')
              .setDescription('Invalid price format. Please use a valid number.');
            await interaction.reply({ embeds: [embed], ephemeral: true });
            return;
          }
          
          const formattedPrice = `$${numericPrice.toFixed(2)}`;
          const image = options.getAttachment('image').url;
          const channel = options.getChannel('channel');
          const addCart = new ButtonBuilder()
                .setCustomId('addCart_' + name + '_' + formattedPrice)
                .setLabel('🛒 Add to cart')
                .setStyle(ButtonStyle.Success);

          const removeCart = new ButtonBuilder()
                .setCustomId('removeCart_' + name + '_' + formattedPrice)
                .setLabel('🗑️ Remove from cart')
                .setStyle(ButtonStyle.Danger);

          const claimRow = new ActionRowBuilder()
                .addComponents(addCart, removeCart);
          
          const embed = new EmbedBuilder()
            .setTitle(`**${name}**`)
            .setDescription('price: ' + '`' + formattedPrice + '`')
            .setImage(`${image}`)
            .setColor(config.color)
            .setFooter({
              text: config.itemEmbedFooter,
            });
          await channel.send({ embeds: [embed], components: [claimRow] });

          const embed2 = new EmbedBuilder()
            .setColor(config.color)
            .setTitle(config.shopAdd)
            .setFooter({
              text: config.footer,
              iconURL: config.logo,
            })
            .setTimestamp();
          await interaction.reply({ embeds: [embed2], ephemeral: true });
        } else {
          const embed = new EmbedBuilder()
            .setTitle(config.noPermissions)
            .setColor(config.errorColor)
            .setFooter({
              text: config.footer,
              iconURL: config.logo,
            })
            .setTimestamp();
          await interaction.reply({ embeds: [embed], ephemeral: true });
        }
      }
    }

    if (commandName === 'cart') {
      const filepath = `./data/carts/${interaction.user.username}.txt`;
      
      if (!fs.existsSync(filepath)) {
        const embed = new EmbedBuilder()
          .setColor(config.errorColor)
          .setTitle(config.noCart);
        await interaction.reply({ embeds: [embed], ephemeral: true });
        return;
      }

      const data = await fsPromises.readFile(filepath, 'utf8');
      
      if (!data.trim()) {
        const embed = new EmbedBuilder()
          .setColor(config.errorColor)
          .setTitle(config.noCart);
        await interaction.reply({ embeds: [embed], ephemeral: true });
        return;
      }

      const total = calculateCartTotal(data);

      const checkoutBtn = new ButtonBuilder()
        .setCustomId('checkoutCart')
        .setLabel('Checkout')
        .setStyle(ButtonStyle.Success);

      const wipeCartBtn = new ButtonBuilder()
        .setCustomId('wipeCart')
        .setLabel('Wipe Cart')
        .setStyle(ButtonStyle.Danger);

      const row = new ActionRowBuilder()
        .addComponents(checkoutBtn, wipeCartBtn);

      const embed = new EmbedBuilder()
        .setColor(config.color)
        .setTitle(config.cart)
        .setDescription(
          `${data}\n` +
          `---------------------------------------------------------------------\n` +
          `�� **Total: $${total}**`
        )
        .setFooter({
          text: config.footer,
          iconURL: config.logo,
        })
        .setTimestamp();

      await interaction.reply({ 
        embeds: [embed], 
        components: [row],
        ephemeral: true 
      });
    }

    if (commandName === 'wipe-cart') {
      const filepath = `./data/carts/${interaction.user.username}.txt`;
      if (fs.existsSync(filepath)) {
        await fsPromises.writeFile(filepath, '');
        const embed = new EmbedBuilder()
          .setTitle(config.cartWipe)
          .setColor(config.color);
        await interaction.reply({ embeds: [embed], ephemeral: true });
      } else {
        const embed = new EmbedBuilder()
          .setTitle(config.noCart)
          .setColor(config.errorColor);
        await interaction.reply({ embeds: [embed], ephemeral: true });
      }
    }

    if (commandName === 'invites') {
      const user = options.getUser('user');
      if (user) {
        let invites = await interaction.guild.invites.fetch();
        let userInv = invites.filter(u => u.inviter && u.inviter.id === user.id);
        let i = 0;
        userInv.forEach(inv => i += inv.uses);
        const embed = new EmbedBuilder()
          .setColor(config.color)
          .setDescription(`${user.tag} has **${i}** invites!`)
          .setFooter({
            text: config.footer,
            iconURL: config.logo,
          })
          .setTimestamp();
        await interaction.reply({ embeds: [embed] });
      } else {
        const user = interaction.user;
        let invites = await interaction.guild.invites.fetch();
        let userInv = invites.filter(u => u.inviter && u.inviter.id === user.id);
        let i = 0;
        userInv.forEach(inv => i += inv.uses);
        const embed = new EmbedBuilder()
          .setColor(config.color)
          .setDescription(`${user.tag} has **${i}** invites!`)
          .setFooter({
            text: config.footer,
            iconURL: config.logo,
          })
          .setTimestamp();
        await interaction.reply({ embeds: [embed] });
      }
    }

    if (commandName === 'order') {
      const ign = options.getString('ign');
      const ticket = await createTicket(interaction, ign);
      if (ticket) {
        // Log ticket creation
        await logToChannel(interaction.guild, {
          title: '🎫 Ticket Created',
          description: `A new ticket has been created`,
          fields: [
            { name: 'Created By', value: `<@${interaction.user.id}>`, inline: true },
            { name: 'IGN', value: ign, inline: true },
            { name: 'Channel', value: `<#${ticket.id}>`, inline: true }
          ],
          color: '#00ff00'
        });
      }
      await createTicket(interaction, ign);
      const embed = new EmbedBuilder()
        .setColor(config.color)
        .setTitle(config.createTicket)
        .setDescription(`#ticket-${interaction.user.username}`);
      await interaction.reply({ embeds: [embed], ephemeral: true });
    }

    if (commandName === 'say') {
      // Check if user has permission to use this command
      const allowedUserIds = ['1346677527254405153', '1187182189931135076']; // Add more IDs as needed
      if (!allowedUserIds.includes(interaction.user.id)) {
        const embed = new EmbedBuilder()
          .setTitle(config.noPermissions)
          .setColor(config.errorColor)
          .setFooter({
            text: config.footer,
            iconURL: config.logo,
          })
          .setTimestamp();
        await interaction.reply({ embeds: [embed], ephemeral: true });
        return;
      }

      // Get the message content and channel
      const message = options.getString('message');
      const channel = options.getChannel('channel') || interaction.channel;
      const embed = options.getBoolean('embed') || false;
      const image = options.getAttachment('image');

      // Check if channel is text-based
      if (!channel.isTextBased()) {
        await interaction.reply({ 
          content: 'Please select a text channel.', 
          ephemeral: true 
        });
        return;
      }

      try {
        if (embed) {
          // Create embed message
          const sayEmbed = new EmbedBuilder()
            .setDescription(message)
            .setColor(config.color)
            .setFooter({
              text: config.footer,
              iconURL: config.logo,
            })
            .setTimestamp();

          if (image) {
            sayEmbed.setImage(image.url);
          }

          await channel.send({ embeds: [sayEmbed] });
        } else {
          // Send regular message
          if (image) {
            await channel.send({ 
              content: message,
              files: [image]
            });
          } else {
            await channel.send(message);
          }
        }

        // Confirm the message was sent
        await interaction.reply({ 
          content: `Message sent to ${channel}!`, 
          ephemeral: true 
        });
      } catch (error) {
        console.error('Error sending message:', error);
        await interaction.reply({ 
          content: 'Failed to send message. Please check bot permissions.', 
          ephemeral: true 
        });
      }
    }
  } catch (err) {
    console.error(`Error handling command: ${err.message}`);
    const embed = new EmbedBuilder()
      .setColor(config.errorColor)
      .setTitle('Error')
      .setDescription('An error occurred while processing your command.');
    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
});

async function saveActiveTicket(userId, ticketInfo) {
  const filePath = path.join(activeTicketsPath, `${userId}.json`);
  await fsPromises.writeFile(filePath, JSON.stringify(ticketInfo, null, 2));
}

async function getActiveTicket(userId) {
  const filePath = path.join(activeTicketsPath, `${userId}.json`);
  try {
    const data = await fsPromises.readFile(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return null;
  }
}

async function removeActiveTicket(userId) {
  const filePath = path.join(activeTicketsPath, `${userId}.json`);
  try {
    // Check if file exists before trying to delete it
    if (fs.existsSync(filePath)) {
      await fsPromises.unlink(filePath);
    }
  } catch (error) {
    // Just log the error but don't throw it
    console.error('Error removing active ticket file:', error);
  }
}

async function findExistingTicket(guild, username) {
  try {
    const tickets = await guild.channels.fetch();
    return tickets.find(
      channel => 
        channel.name === `ticket-${username}` && 
        channel.parentId === config.ticketCategoryId &&
        channel.type === ChannelType.GuildText
    );
  } catch (error) {
    console.error('Error finding existing ticket:', error);
    return null;
  }
}

// Add this helper function to calculate cart total
function calculateCartTotal(cartContent) {
  let total = 0;
  const lines = cartContent.split('\n');
  for (const line of lines) {
    if (line.trim()) {
      const priceMatch = line.match(/\[\$(\d+\.?\d*)\]/);
      if (priceMatch && priceMatch[1]) {
        total += parseFloat(priceMatch[1]);
      }
    }
  }
  return total.toFixed(2);
}

// Update the updateExistingTicket function
async function updateExistingTicket(channel, interaction, ign) {
  const filepath = `./data/carts/${interaction.user.username}.txt`;
  const data = await fsPromises.readFile(filepath, 'utf8');
  const invites = await getInvites(interaction, interaction.user);
  const total = calculateCartTotal(data);

  const embed = new EmbedBuilder()
    .setColor(config.color)
    .setTitle(`${interaction.user.username}'s Updated Order`)
    .setDescription(
      `📕 **support will be with you shortly!** \n\n` +
      `🛒 **updated cart**: \n${data}\n` +
      `💰 **Total: $${total}**\n\n` +
      `🧱 **in game name**: \n${ign}\n\n` +
      `🎫 **invites:** \n${invites}`
    )
    .setThumbnail(config.logo)
    .setFooter({
      text: config.footer,
      iconURL: config.logo,
    })
    .setTimestamp();

  await channel.send({ 
    content: `<@${interaction.user.id}> Updated their order!`, 
    embeds: [embed]
  });
}

// Add logging function
async function logToChannel(guild, options) {
  try {
    const logChannel = await guild.channels.fetch(config.logChannelId);
    if (!logChannel) return;

    const embed = new EmbedBuilder()
      .setColor(options.color || config.color)
      .setTitle(options.title || 'Log Entry')
      .setDescription(options.description || '')
      .setTimestamp();

    if (options.fields) {
      embed.addFields(options.fields);
    }

    if (options.footer) {
      embed.setFooter(options.footer);
    }

    // If there's ticket content to save
    if (options.ticketContent) {
      const buffer = Buffer.from(options.ticketContent, 'utf8');
      const attachment = new AttachmentBuilder(buffer, { name: 'ticket-content.txt' });
      return await logChannel.send({ embeds: [embed], files: [attachment] });
    }

    return await logChannel.send({ embeds: [embed] });
  } catch (error) {
    console.error('Error logging to channel:', error);
  }
}

async function createTicket(interaction, ign) {
  try {
    // Check if category exists first
    const category = await interaction.guild.channels.fetch(config.ticketCategoryId).catch(() => null);
    if (!category) {
      const embed = new EmbedBuilder()
        .setColor(config.errorColor)
        .setTitle('Error')
        .setDescription('Ticket category not found. Please contact an administrator to set up the ticket category.')
        .setFooter({
          text: config.footer,
          iconURL: config.logo,
        });
      await interaction.reply({ embeds: [embed], ephemeral: true });
      return null;
    }

    // Final check for existing ticket before creation
    const existingTicket = await findExistingTicket(interaction.guild, interaction.user.username);
    if (existingTicket) {
      await updateExistingTicket(existingTicket, interaction, ign);
      return existingTicket;
    }

    const { ViewChannel } = PermissionFlagsBits;
    const channel = await interaction.guild.channels.create({
      name: "ticket-" + interaction.user.username,
      type: ChannelType.GuildText,
      parent: config.ticketCategoryId,
      permissionOverwrites: [
        {
          id: interaction.user.id,
          allow: [ViewChannel]
        },
        {
          id: config.ticketView,
          allow: [ViewChannel]
        },
        {
          id: config.memberRole,
          deny: [ViewChannel]
        },
        {
          id: category.guild.roles.everyone.id,
          deny: [ViewChannel]
        }
      ]
    });

    const channelToSend = await client.channels.fetch(channel.id);
    if (!channelToSend) {
      throw new Error('Could not access the created ticket channel');
    }

    const filepath = `./data/carts/${interaction.user.username}.txt`;
    
    try {
      if (!fs.existsSync(filepath)) {
        const closeTicket = new ButtonBuilder()
          .setCustomId('closeTicket_' + channel.id)
          .setLabel('🗑️ Close Ticket')
          .setStyle(ButtonStyle.Danger);

        const Row = new ActionRowBuilder()
          .setComponents(closeTicket);

        const embed = new EmbedBuilder()
          .setTitle(config.noUserCart)
          .setColor(config.errorColor);
        await channelToSend.send({ embeds: [embed], components: [Row] });
        return channel;
      }

      const data = await fsPromises.readFile(filepath, 'utf8');
      const invites = await getInvites(interaction, interaction.user);
      const total = calculateCartTotal(data);
      
      const paypal = new ButtonBuilder()
        .setCustomId('payment_paypal')
        .setLabel('PayPal')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('💰');

      const cashapp = new ButtonBuilder()
        .setCustomId('payment_cashapp')
        .setLabel('Cash App')
        .setStyle(ButtonStyle.Success)
        .setEmoji('💵');

      const card = new ButtonBuilder()
        .setCustomId('payment_card')
        .setLabel('Credit/Debit Card')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('💳');

      const crypto = new ButtonBuilder()
        .setCustomId('payment_crypto')
        .setLabel('Crypto')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('🪙');

      const closeTicket = new ButtonBuilder()
        .setCustomId('closeTicket_' + channel.id)
        .setLabel('🗑️ Close Ticket')
        .setStyle(ButtonStyle.Danger);

      const paymentRow = new ActionRowBuilder()
        .addComponents(paypal, cashapp, card, crypto);

      const closeRow = new ActionRowBuilder()
        .addComponents(closeTicket);

      const embed = new EmbedBuilder()
        .setColor(config.color)
        .setTitle(`${interaction.user.username}'s Order`)
        .setDescription(
          `📕 **support will be with you shortly!** \n\n` +
          `🛒 **cart**: \n${data}\n` +
          `💰 **Total: $${total}**\n\n` +
          `🧱 **in game name**: \n${ign}\n\n` +
          `🎫 **invites:** \n${invites}`
        )
        .setThumbnail(config.logo)
        .setFooter({
          text: config.footer,
          iconURL: config.logo,
        })
        .setTimestamp();

      await channelToSend.send({ 
        content: `<@${interaction.user.id}>`, 
        embeds: [embed], 
        components: [paymentRow, closeRow] 
      });

      // Generate a unique order ID
      const orderId = `ORDER-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      // Save the order ID with the ticket info
      await saveActiveTicket(interaction.user.id, {
          channelId: channel.id,
          ign: ign,
          orderId: orderId
      });

      // After successfully creating the ticket, log it
      await logToChannel(interaction.guild, {
        title: '🎫 Ticket Created',
        description: `A new ticket has been created by ${interaction.user.tag}`,
        fields: [
          { name: 'User', value: `<@${interaction.user.id}>`, inline: true },
          { name: 'IGN', value: ign, inline: true },
          { name: 'Ticket Channel', value: `<#${channel.id}>`, inline: true }
        ],
        color: '#00ff00'
      });

      return channel;
    } catch (err) {
      console.error(`Error accessing cart file: ${err.message}`);
      const embed = new EmbedBuilder()
        .setColor(config.errorColor)
        .setTitle('Error')
        .setDescription('An error occurred while accessing your cart.');
      await channelToSend.send({ embeds: [embed] });
      return channel;
    }
  } catch (err) {
    console.error(`Error in ticket creation: ${err.message}`);
    const embed = new EmbedBuilder()
      .setColor(config.errorColor)
      .setTitle('Error')
      .setDescription('Failed to create ticket. Please ensure the bot has proper permissions and try again.');
    await interaction.reply({ embeds: [embed], ephemeral: true });
    return null;
  }
}

client.on('interactionCreate', async interaction => {
  if (!interaction.isButton() && !interaction.isModalSubmit()) return;

  if (interaction.customId.startsWith('addCart_')) {
    const args = splitCustomId(interaction.customId);
    const name = args[1];
    const price = args[2];

    // Create and show quantity modal
    const modal = new ModalBuilder()
      .setCustomId(`quantity_${name}_${price}`)
      .setTitle('Add Item to Cart');

    const quantityInput = new TextInputBuilder()
      .setCustomId('itemQuantity')
      .setLabel('Enter Item Quantity')
      .setStyle(TextInputStyle.Short)
      .setRequired(true)
      .setPlaceholder('Enter a number');

    const firstActionRow = new ActionRowBuilder().addComponents(quantityInput);
    modal.addComponents(firstActionRow);

    await interaction.showModal(modal);
  }

  // Add this handler for the IGN button
  if (interaction.customId === 'showIgnModal') {
    try {
      const modal = new ModalBuilder()
        .setCustomId('ignInput_afterCart')
        .setTitle('Enter Your In-Game Name');

      const ignInput = new TextInputBuilder()
        .setCustomId('ignInput')
        .setLabel('What is your in-game name?')
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setPlaceholder('Enter your IGN here');

      const firstActionRow = new ActionRowBuilder().addComponents(ignInput);
      modal.addComponents(firstActionRow);

      await interaction.showModal(modal);
    } catch (error) {
      console.error('Error showing IGN modal:', error);
      await interaction.reply({ 
        content: 'There was an error showing the IGN input. Please try again.', 
        ephemeral: true 
      });
    }
  }

  // Handle quantity modal submit
  if (interaction.isModalSubmit() && interaction.customId.startsWith('quantity_')) {
    try {
      const args = splitCustomId(interaction.customId);
      const name = args[1];
      const price = args[2].replace('$', ''); // Remove $ if present
      const quantity = parseInt(interaction.fields.getTextInputValue('itemQuantity'));
      
      if (isNaN(quantity) || quantity <= 0) {
        const embed = new EmbedBuilder()
          .setColor(config.errorColor)
          .setTitle('Error')
          .setDescription('Please enter a valid quantity (must be a positive number).');
        await interaction.reply({ embeds: [embed], ephemeral: true });
        return;
      }

      // Ensure price is a valid number
      const numericPrice = parseFloat(price);
      if (isNaN(numericPrice)) {
        const embed = new EmbedBuilder()
          .setColor(config.errorColor)
          .setTitle('Error')
          .setDescription('Invalid price format. Please contact an administrator.');
        await interaction.reply({ embeds: [embed], ephemeral: true });
        return;
      }

      const totalPrice = (numericPrice * quantity).toFixed(2);
      const cartFilePath = `./data/carts/${interaction.user.username}.txt`;

      // Create data directory if it doesn't exist
      const dataDir = path.join(__dirname, '..', 'data');
      const cartsDir = path.join(dataDir, 'carts');
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir);
      }
      if (!fs.existsSync(cartsDir)) {
        fs.mkdirSync(cartsDir);
      }

      // Add item to cart with proper price formatting
      const cartEntry = `${quantity}x ${name} [$${totalPrice}]\n`;
      
      if (!fs.existsSync(cartFilePath)) {
        fs.writeFileSync(cartFilePath, cartEntry);
      } else {
        fs.appendFileSync(cartFilePath, cartEntry);
      }

      // Check for active ticket
      const activeTicket = await getActiveTicket(interaction.user.id);
      
      if (activeTicket) {
        try {
          // Try to fetch the channel
          const channel = await interaction.guild.channels.fetch(activeTicket.channelId);
          
          if (channel) {
            // Channel exists, update it
            await updateExistingTicket(channel, interaction, activeTicket.ign);
            const embed = new EmbedBuilder()
              .setColor(config.color)
              .setTitle('Cart Updated!')
              .setDescription(`Your order has been updated in <#${channel.id}>`);
            await interaction.reply({ embeds: [embed], ephemeral: true });

            // After successfully adding to cart
            await logToChannel(interaction.guild, {
              title: '🛒 Cart Updated',
              description: `${interaction.user.tag} added items to their cart`,
              fields: [
                { name: 'User', value: `<@${interaction.user.id}>`, inline: true },
                { name: 'Item', value: `${quantity}x ${name}`, inline: true },
                { name: 'Total Price', value: `$${totalPrice}`, inline: true }
              ],
              color: '#00ff00'
            });

            return;
          } else {
            // Channel doesn't exist, remove the active ticket data
            await removeActiveTicket(interaction.user.id);
          }
        } catch (err) {
          if (err.code === 10003) { // Unknown Channel error
            // Remove the active ticket data as the channel no longer exists
            await removeActiveTicket(interaction.user.id);
          } else {
            console.error('Error updating existing ticket:', err);
          }
        }
      }

      // If we get here, either there was no active ticket or it was invalid/removed
      const embed = new EmbedBuilder()
        .setTitle(`${config.addCart}`)
        .setDescription('Please provide your in-game name to create your ticket.')
        .setColor(config.color)
        .setFooter({
          text: config.footer,
          iconURL: config.logo,
        })
        .setTimestamp();
      
      await interaction.reply({ embeds: [embed], ephemeral: true });
      await interaction.followUp({ 
        content: 'Please enter your in-game name:', 
        components: [new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('showIgnModal')
            .setLabel('Enter IGN')
            .setStyle(ButtonStyle.Primary)
        )],
        ephemeral: true 
      });
    } catch (err) {
      console.error('Error handling cart addition:', err);
      const embed = new EmbedBuilder()
        .setColor(config.errorColor)
        .setTitle('Error')
        .setDescription('An error occurred while adding the item to your cart. Please try again.');
      await interaction.reply({ embeds: [embed], ephemeral: true });
    }
  }

  // Handle IGN modal submit
  if (interaction.isModalSubmit() && interaction.customId === 'ignInput_afterCart') {
    const ign = interaction.fields.getTextInputValue('ignInput');
    const existingTicket = await findExistingTicket(interaction.guild, interaction.user.username);
    
    if (existingTicket) {
      // Update existing ticket
      await saveActiveTicket(interaction.user.id, {
        channelId: existingTicket.id,
        ign: ign
      });
      await updateExistingTicket(existingTicket, interaction, ign);
      const embed = new EmbedBuilder()
        .setColor(config.color)
        .setTitle('Cart Updated!')
        .setDescription(`Your order has been updated in <#${existingTicket.id}>`);
      await interaction.reply({ embeds: [embed], ephemeral: true });
    } else {
      // Create new ticket
      const ticket = await createTicket(interaction, ign);
      await saveActiveTicket(interaction.user.id, {
        channelId: ticket.id,
        ign: ign
      });
      const embed = new EmbedBuilder()
        .setColor(config.color)
        .setTitle(config.createTicket)
        .setDescription(`<#${ticket.id}>`);
      await interaction.reply({ embeds: [embed], ephemeral: true });
    }
  }

  if (interaction.customId === 'viewPaymentMethods') {
    const paypal = new ButtonBuilder()
      .setCustomId('payment_paypal')
      .setLabel('PayPal')
      .setStyle(ButtonStyle.Primary)
      .setEmoji('💰');

    const cashapp = new ButtonBuilder()
      .setCustomId('payment_cashapp')
      .setLabel('Cash App')
      .setStyle(ButtonStyle.Success)
      .setEmoji('💵');

    const card = new ButtonBuilder()
      .setCustomId('payment_card')
      .setLabel('Credit/Debit Card')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji('💳');

    const crypto = new ButtonBuilder()
      .setCustomId('payment_crypto')
      .setLabel('Crypto')
      .setStyle(ButtonStyle.Primary)
      .setEmoji('🪙');

    const row = new ActionRowBuilder()
      .addComponents(paypal, cashapp, card, crypto);

    const embed = new EmbedBuilder()
      .setTitle('Select Payment Method')
      .setDescription('Choose your preferred payment method below')
      .setColor(config.color);

    await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
  }

  // Handle payment method selection
  if (interaction.customId.startsWith('payment_')) {
    const paymentType = interaction.customId.split('_')[1];
    let paymentUrl = '';
    let paymentInfo = '';

    switch(paymentType) {
      case 'paypal':
        paymentUrl = config.paypalUrl;
        if (!paymentUrl.startsWith('https://')) {
          paymentUrl = 'https://' + paymentUrl;
        }
        paymentInfo = 'You will be redirected to PayPal to complete your payment.';
        break;
      case 'cashapp':
        paymentUrl = config.cashappUrl;
        if (!paymentUrl.startsWith('https://')) {
          paymentUrl = 'https://' + paymentUrl;
        }
        paymentInfo = 'You will be redirected to Cash App to complete your payment.';
        break;
      case 'card':
        paymentUrl = config.cardUrl;
        if (!paymentUrl.startsWith('https://')) {
          paymentUrl = 'https://' + paymentUrl;
        }
        paymentInfo = 'You will be redirected to our secure payment gateway.';
        break;
      case 'crypto':
        paymentInfo = `Bitcoin Address: ${config.bitcoinAddress}`;
        break;
    }

    const embed = new EmbedBuilder()
      .setTitle('Payment Information')
      .setDescription(paymentInfo)
      .setColor(config.color);

    if (paymentType === 'crypto') {
      await interaction.reply({ embeds: [embed], ephemeral: true });
    } else {
      try {
        // Validate URL before creating button
        new URL(paymentUrl); // This will throw an error if URL is invalid
        
        const payButton = new ButtonBuilder()
          .setLabel('Proceed to Payment')
          .setStyle(ButtonStyle.Link)
          .setURL(paymentUrl);

        const row = new ActionRowBuilder().addComponents(payButton);
        await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
      } catch (error) {
        console.error('Invalid payment URL:', paymentUrl);
        await interaction.reply({ 
          embeds: [new EmbedBuilder()
            .setTitle('Error')
            .setDescription('Payment URL is not properly configured. Please contact an administrator.')
            .setColor(config.errorColor)], 
          ephemeral: true 
        });
      }
    }

    // Log the payment method selection
    await logToChannel(interaction.guild, {
      title: '💰 Payment Method Selected',
      description: `A payment method has been selected in ${interaction.channel.name}`,
      fields: [
        { name: 'User', value: `<@${interaction.user.id}>`, inline: true },
        { name: 'Payment Method', value: paymentType.charAt(0).toUpperCase() + paymentType.slice(1), inline: true },
        { name: 'Channel', value: `<#${interaction.channel.id}>`, inline: true }
      ],
      color: '#00ff00'
    });
  }

  if (interaction.customId.startsWith('removeCart_')) {
    const args = splitCustomId(interaction.customId);
    const name = args[1];
    const price = args[2]
    const filepath = `./data/carts/${interaction.user.username}.txt`;

    removeLineFromFile(filepath, `${name} [**${price}**]`);

    const embed = new EmbedBuilder()
    .setTitle(`${config.removeCart}`)
    .setDescription(config.viewCart)
    .setColor(config.color)
    .setFooter({
      text: config.footer,
      iconURL: config.logo,
    })
    .setTimestamp();
    interaction.reply({ embeds: [embed], ephemeral: true });
  }

  if (interaction.customId.startsWith('closeTicket_')) {
    const channelId = removeString(interaction.customId, 'closeTicket_');
    const channel = interaction.guild.channels.cache.get(channelId);
    
    if (channel) {
      try {
        // Fetch all messages for logging
        const messages = await channel.messages.fetch();
        let ticketContent = `Ticket Log for #${channel.name}\nClosed by: ${interaction.user.tag}\nDate: ${new Date().toISOString()}\n\n`;
        
        // Convert messages to readable format
        const orderedMessages = Array.from(messages.values()).reverse();
        for (const msg of orderedMessages) {
          const timestamp = msg.createdAt.toISOString();
          const author = msg.author.tag;
          const content = msg.content || 'No content';
          
          // Add embeds content if any
          const embedsContent = msg.embeds.map(embed => {
            let embedText = '';
            if (embed.title) embedText += `[Title: ${embed.title}] `;
            if (embed.description) embedText += embed.description;
            return embedText;
          }).join(' ');

          ticketContent += `[${timestamp}] ${author}: ${content} ${embedsContent}\n`;
        }

        // Find ticket owner and wipe their cart
        let ticketOwnerId = channel.topic;
        if (!ticketOwnerId) {
          // Try to find owner from ticket files
          const ticketFiles = await fsPromises.readdir(activeTicketsPath);
          for (const file of ticketFiles) {
            try {
              const data = await fsPromises.readFile(path.join(activeTicketsPath, file), 'utf8');
              const ticketInfo = JSON.parse(data);
              if (ticketInfo.channelId === channelId) {
                ticketOwnerId = file.replace('.json', '');
                break;
              }
            } catch (err) {
              console.error('Error reading ticket file:', err);
            }
          }
        }

        if (ticketOwnerId) {
          // Get the user from the ID
          const ticketOwner = await interaction.guild.members.fetch(ticketOwnerId);
          if (ticketOwner) {
            // Wipe their cart
            const cartFilePath = `./data/carts/${ticketOwner.user.username}.txt`;
            if (fs.existsSync(cartFilePath)) {
              await fsPromises.writeFile(cartFilePath, '');
              
              // Log the cart wipe
              await logToChannel(interaction.guild, {
                title: '🛒 Cart Wiped',
                description: `Cart has been wiped after ticket closure`,
                fields: [
                  { name: 'User', value: `<@${ticketOwner.id}>`, inline: true },
                  { name: 'Ticket', value: channel.name, inline: true }
                ],
                color: '#ff9900'
              });
            }
          }
        }

        // Log the ticket closure
        await logToChannel(interaction.guild, {
          title: '🔒 Ticket Closed',
          description: `Ticket ${channel.name} has been closed`,
          fields: [
            { name: 'Closed By', value: `<@${interaction.user.id}>`, inline: true },
            { name: 'Ticket Owner', value: `<@${ticketOwnerId || 'Unknown'}>`, inline: true }
          ],
          ticketContent: ticketContent,
          color: '#ff9900'
        });

        // Clean up ticket data
        const ticketFiles = await fsPromises.readdir(activeTicketsPath);
        for (const file of ticketFiles) {
          try {
            const data = await fsPromises.readFile(path.join(activeTicketsPath, file), 'utf8');
            const ticketInfo = JSON.parse(data);
            if (ticketInfo.channelId === channelId) {
              await removeActiveTicket(file.replace('.json', ''));
              break;
            }
          } catch (err) {
            console.error('Error reading ticket file:', err);
          }
        }

        // Send confirmation and delete channel
        await interaction.reply({ 
          content: 'Closing ticket and wiping cart...', 
          flags: 1 << 6
        });
        
        setTimeout(async () => {
          try {
            await channel.delete();
          } catch (err) {
            console.error('Error deleting channel:', err);
          }
        }, 1000);
      } catch (err) {
        console.error('Error in ticket cleanup:', err);
        await interaction.reply({ 
          content: 'The ticket was closed, but there might have been some cleanup errors.', 
          flags: 1 << 6
        });
      }
    } else {
      await interaction.reply({ 
        content: 'This ticket has already been closed.', 
        flags: 1 << 6
      });
    }
  }

  // Handle checkout button from cart view
  if (interaction.customId === 'checkoutCart') {
    // Ask for IGN using modal
    const modal = new ModalBuilder()
      .setCustomId('checkoutModal')
      .setTitle('Enter Your In-Game Name');

    const ignInput = new TextInputBuilder()
      .setCustomId('ignInput')
      .setLabel('What is your in-game name?')
      .setStyle(TextInputStyle.Short)
      .setRequired(true)
      .setPlaceholder('Enter your IGN here');

    const firstActionRow = new ActionRowBuilder().addComponents(ignInput);
    modal.addComponents(firstActionRow);

    await interaction.showModal(modal);
  }

  // Handle IGN modal submit for checkout
  if (interaction.isModalSubmit() && interaction.customId === 'checkoutModal') {
    const ign = interaction.fields.getTextInputValue('ignInput');
    await createTicket(interaction, ign);
    const embed = new EmbedBuilder()
      .setColor(config.color)
      .setTitle(config.createTicket)
      .setDescription(`#ticket-${interaction.user.username}`);
    await interaction.reply({ embeds: [embed], ephemeral: true });
  }

  // Handle wipe cart button
  if (interaction.customId === 'wipeCart') {
    const filepath = `./data/carts/${interaction.user.username}.txt`;
    if (fs.existsSync(filepath)) {
      await fsPromises.writeFile(filepath, '');
      const embed = new EmbedBuilder()
        .setTitle(config.cartWipe)
        .setColor(config.color);
      await interaction.reply({ embeds: [embed], ephemeral: true });
    } else {
      const embed = new EmbedBuilder()
        .setTitle(config.noCart)
        .setColor(config.errorColor);
      await interaction.reply({ embeds: [embed], ephemeral: true });
    }
  }

  // Add handler for delivery button
  if (interaction.customId.startsWith('deliver_')) {
    const orderId = interaction.customId.replace('deliver_', '');
    const member = interaction.guild.members.cache.get(interaction.user.id);
    
    if (member && member.roles.cache.has(config.ticketView)) {
      const embed = new EmbedBuilder()
        .setColor('#00ff00')
        .setTitle('Order Delivered ✅')
        .setDescription(
          `🎉 Order has been marked as delivered by ${interaction.user.tag}\n` +
          `📝 Order ID: ${orderId}`
        )
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
      
      // Disable the delivery button
      const disabledButton = ButtonBuilder.from(interaction.message.components[0].components[0])
        .setDisabled(true)
        .setLabel('✅ Delivered');
      
      const row = new ActionRowBuilder()
        .addComponents(disabledButton);

      await interaction.message.edit({ components: [row] });
    } else {
      await interaction.reply({ 
        content: 'You do not have permission to mark orders as delivered.',
        ephemeral: true 
      });
    }
  }
});

async function giveRole(interaction, userId, roleId, guild) {
  const role = await guild.roles.fetch(roleId);
  try {
    await interaction.guild.members.cache.get(userId).roles.add(role)
  } catch(error) {
    console.error('error: ' + error)
  }
}

function removeLineFromFile(filePath, searchString) {
    fs.readFile(filePath, 'utf8', (err, data) => {
      if (err) {
        console.error(err);
        return;
      }
      const lines = data.split('\n');
      const filteredLines = lines.filter(line => !line.includes(searchString));
      const updatedContent = filteredLines.join('\n');
      fs.writeFile(filePath, updatedContent, 'utf8', (err) => {
        if (err) {
          console.error(err);
          return;
        }
      });
    });
}

async function getInvites(interaction, input) {
  const user = input;
  if (user) {
    let invites = await interaction.guild.invites.fetch();
    let userInv = invites.filter(u => u.inviter && u.inviter.id === user.id);
    let i = 0;
    userInv.forEach(inv => i += inv.uses);
    return i;
  }
}

function removeString(originalString, substringToRemove) {
  return originalString.replace(substringToRemove, "");
}

function splitCustomId(input) {
  const result = input.split('_');
  return result;
}

client.login(config.token);