import { SlashCommandBuilder, PermissionFlagsBits, type ChatInputCommandInteraction, type GuildMember } from 'discord.js';
import { prisma } from '../../lib/database.js';
import { successEmbed, errorEmbed } from '../../lib/embeds.js';
import { canModerate } from '../../lib/permissions.js';

export default {
  data: new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Ban a user from the server')
    .addUserOption(opt => opt.setName('user').setDescription('User to ban').setRequired(true))
    .addStringOption(opt => opt.setName('reason').setDescription('Reason for the ban'))
    .addIntegerOption(opt => opt.setName('days').setDescription('Days of messages to delete (0-7)').setMinValue(0).setMaxValue(7))
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),
  async execute(interaction: ChatInputCommandInteraction) {
    const target = interaction.options.getUser('user', true);
    const reason = interaction.options.getString('reason') ?? 'No reason provided';
    const days = interaction.options.getInteger('days') ?? 0;
    const botMember = interaction.guild!.members.me!;
    const member = interaction.member as GuildMember;

    if (!member.permissions.has(PermissionFlagsBits.BanMembers)) {
      return interaction.reply({ embeds: [errorEmbed('Missing Permissions', 'You need Ban Members permission.')], ephemeral: true });
    }
    if (!botMember.permissions.has(PermissionFlagsBits.BanMembers)) {
      return interaction.reply({ embeds: [errorEmbed('Missing Permissions', 'I need Ban Members permission.')], ephemeral: true });
    }

    const targetMember = await interaction.guild!.members.fetch(target.id).catch(() => null);
    if (targetMember) {
      if (!canModerate(botMember, targetMember)) {
        return interaction.reply({ embeds: [errorEmbed('Cannot Ban', 'This user has a higher or equal role than me.')], ephemeral: true });
      }
      if (targetMember.roles.highest.position >= member.roles.highest.position) {
        return interaction.reply({ embeds: [errorEmbed('Cannot Ban', 'This user has a higher or equal role than you.')], ephemeral: true });
      }
      // DM the user before banning
      await target.send(`You have been banned from **${interaction.guild!.name}**.\nReason: ${reason}`).catch(() => {});
    }

    try {
      await interaction.guild!.members.ban(target, { reason, deleteMessageSeconds: days * 86400 });
      await prisma.modAction.create({
        data: { guildId: interaction.guildId!, userId: target.id, moderatorId: interaction.user.id, action: 'ban', reason },
      });
      await interaction.reply({ embeds: [successEmbed('User Banned', `**${target.tag}** has been banned.\nReason: ${reason}`)] });
    } catch {
      await interaction.reply({ embeds: [errorEmbed('Ban Failed', 'Could not ban this user.')], ephemeral: true });
    }
  },
};
