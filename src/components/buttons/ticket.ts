import { type ButtonInteraction, ChannelType, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } from 'discord.js';
import { prisma } from '../../lib/database.js';
import { errorEmbed, successEmbed } from '../../lib/embeds.js';
import { logger } from '../../lib/logger.js';

export default async function handleTicketButton(interaction: ButtonInteraction) {
  const [, action] = interaction.customId.split(':');

  if (action === 'create') {
    const config = await prisma.ticketConfig.findUnique({ where: { guildId: interaction.guildId! } });
    if (!config) {
      return interaction.reply({ embeds: [errorEmbed('Not Configured', 'Ticket system is not set up.')], ephemeral: true });
    }

    const openCount = await prisma.ticket.count({
      where: { guildId: interaction.guildId!, userId: interaction.user.id, status: 'open' },
    });
    if (openCount >= config.maxOpen) {
      return interaction.reply({ embeds: [errorEmbed('Limit Reached', `You can only have ${config.maxOpen} open tickets.`)], ephemeral: true });
    }

    try {
      const ticketNum = await prisma.ticket.count({ where: { guildId: interaction.guildId! } }) + 1;
      const channelName = `ticket-${interaction.user.username}-${ticketNum}`;

      const channel = await interaction.guild!.channels.create({
        name: channelName,
        type: ChannelType.GuildText,
        parent: config.categoryId ?? undefined,
        permissionOverwrites: [
          { id: interaction.guildId!, deny: [PermissionFlagsBits.ViewChannel] },
          { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
          { id: config.supportRoleId, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
          { id: interaction.client.user!.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageChannels] },
        ],
      });

      await prisma.ticket.create({
        data: { guildId: interaction.guildId!, channelId: channel.id, userId: interaction.user.id },
      });

      const embed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle(`Ticket #${ticketNum}`)
        .setDescription(`${config.greeting}\n\nCreated by ${interaction.user}`)
        .setTimestamp();

      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder().setCustomId('ticket:close').setLabel('Close Ticket').setStyle(ButtonStyle.Danger),
      );

      await channel.send({ embeds: [embed], components: [row] });
      await interaction.reply({ content: `Ticket created: ${channel}`, ephemeral: true });
    } catch (error) {
      logger.error(error, 'Ticket creation error');
      await interaction.reply({ embeds: [errorEmbed('Error', 'Could not create ticket.')], ephemeral: true });
    }
  }

  if (action === 'close') {
    const ticket = await prisma.ticket.findUnique({ where: { channelId: interaction.channelId } });
    if (!ticket || ticket.status === 'closed') {
      return interaction.reply({ embeds: [errorEmbed('Error', 'This is not an open ticket.')], ephemeral: true });
    }

    await prisma.ticket.update({ where: { id: ticket.id }, data: { status: 'closed', closedAt: new Date() } });
    await interaction.reply({ embeds: [successEmbed('Ticket Closing', `Closed by ${interaction.user}. Channel will be deleted in 5 seconds.`)] });
    setTimeout(() => interaction.channel?.delete().catch(() => {}), 5000);
  }
}
