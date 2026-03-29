import {
  SlashCommandBuilder, PermissionFlagsBits, ChannelType, EmbedBuilder,
  ActionRowBuilder, ButtonBuilder, ButtonStyle,
  type ChatInputCommandInteraction, type TextChannel,
} from 'discord.js';
import { prisma } from '../../lib/database.js';
import { successEmbed, errorEmbed } from '../../lib/embeds.js';

export default {
  data: new SlashCommandBuilder()
    .setName('ticket')
    .setDescription('Ticket system')
    .addSubcommand(sub => sub.setName('setup').setDescription('Set up the ticket panel')
      .addRoleOption(opt => opt.setName('support-role').setDescription('Support team role').setRequired(true))
      .addChannelOption(opt => opt.setName('panel-channel').setDescription('Channel for the ticket panel').addChannelTypes(ChannelType.GuildText).setRequired(true)))
    .addSubcommand(sub => sub.setName('close').setDescription('Close the current ticket')
      .addStringOption(opt => opt.setName('reason').setDescription('Reason for closing')))
    .addSubcommand(sub => sub.setName('add').setDescription('Add a user to this ticket')
      .addUserOption(opt => opt.setName('user').setDescription('User to add').setRequired(true)))
    .addSubcommand(sub => sub.setName('remove').setDescription('Remove a user from this ticket')
      .addUserOption(opt => opt.setName('user').setDescription('User to remove').setRequired(true)))
    .addSubcommand(sub => sub.setName('claim').setDescription('Claim this ticket'))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  async execute(interaction: ChatInputCommandInteraction) {
    const sub = interaction.options.getSubcommand();

    if (sub === 'setup') {
      const role = interaction.options.getRole('support-role', true);
      const channel = interaction.options.getChannel('panel-channel', true) as TextChannel;

      const embed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle('Support Tickets')
        .setDescription('Click the button below to create a support ticket.');

      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder().setCustomId('ticket:create').setLabel('Create Ticket').setStyle(ButtonStyle.Primary).setEmoji('\uD83C\uDFAB'),
      );

      const msg = await channel.send({ embeds: [embed], components: [row] });

      await prisma.ticketConfig.upsert({
        where: { guildId: interaction.guildId! },
        update: { supportRoleId: role.id, panelChannelId: channel.id, panelMessageId: msg.id },
        create: { guildId: interaction.guildId!, supportRoleId: role.id, panelChannelId: channel.id, panelMessageId: msg.id },
      });

      await interaction.reply({ embeds: [successEmbed('Ticket Panel Created', `Panel sent to ${channel}.`)], ephemeral: true });
    }

    if (sub === 'close') {
      const ticket = await prisma.ticket.findUnique({ where: { channelId: interaction.channelId } });
      if (!ticket || ticket.status === 'closed') {
        return interaction.reply({ embeds: [errorEmbed('Not a Ticket', 'This is not an open ticket channel.')], ephemeral: true });
      }
      const reason = interaction.options.getString('reason') ?? 'No reason';
      await prisma.ticket.update({ where: { id: ticket.id }, data: { status: 'closed', closedAt: new Date() } });
      await interaction.reply({ embeds: [successEmbed('Ticket Closed', `Closed by ${interaction.user}. Reason: ${reason}\nThis channel will be deleted in 5 seconds.`)] });
      setTimeout(() => interaction.channel?.delete().catch(() => {}), 5000);
    }

    if (sub === 'add') {
      const user = interaction.options.getUser('user', true);
      const channel = interaction.channel as TextChannel;
      await channel.permissionOverwrites.edit(user.id, { ViewChannel: true, SendMessages: true });
      await interaction.reply({ embeds: [successEmbed('User Added', `${user} has been added to this ticket.`)] });
    }

    if (sub === 'remove') {
      const user = interaction.options.getUser('user', true);
      const channel = interaction.channel as TextChannel;
      await channel.permissionOverwrites.delete(user.id);
      await interaction.reply({ embeds: [successEmbed('User Removed', `${user} has been removed from this ticket.`)] });
    }

    if (sub === 'claim') {
      const ticket = await prisma.ticket.findUnique({ where: { channelId: interaction.channelId } });
      if (!ticket) return interaction.reply({ embeds: [errorEmbed('Not a Ticket', 'This is not a ticket channel.')], ephemeral: true });
      await prisma.ticket.update({ where: { id: ticket.id }, data: { claimedById: interaction.user.id } });
      await interaction.reply({ embeds: [successEmbed('Ticket Claimed', `This ticket has been claimed by ${interaction.user}.`)] });
    }
  },
};
