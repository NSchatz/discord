import { SlashCommandBuilder, PermissionFlagsBits, type ChatInputCommandInteraction, type GuildMember } from 'discord.js';
import { prisma } from '../../lib/database.js';
import { successEmbed, errorEmbed } from '../../lib/embeds.js';
import { canModerate } from '../../lib/permissions.js';

export default {
  data: new SlashCommandBuilder()
    .setName('kick')
    .setDescription('Kick a user from the server')
    .addUserOption(opt => opt.setName('user').setDescription('User to kick').setRequired(true))
    .addStringOption(opt => opt.setName('reason').setDescription('Reason for the kick'))
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),
  async execute(interaction: ChatInputCommandInteraction) {
    const target = interaction.options.getUser('user', true);
    const reason = interaction.options.getString('reason') ?? 'No reason provided';
    const botMember = interaction.guild!.members.me!;
    const member = interaction.member as GuildMember;

    const targetMember = await interaction.guild!.members.fetch(target.id).catch(() => null);
    if (!targetMember) {
      return interaction.reply({ embeds: [errorEmbed('Not Found', 'User is not in this server.')], ephemeral: true });
    }
    if (!canModerate(botMember, targetMember)) {
      return interaction.reply({ embeds: [errorEmbed('Cannot Kick', 'This user has a higher or equal role than me.')], ephemeral: true });
    }
    if (targetMember.roles.highest.position >= member.roles.highest.position) {
      return interaction.reply({ embeds: [errorEmbed('Cannot Kick', 'This user has a higher or equal role than you.')], ephemeral: true });
    }

    await target.send(`You have been kicked from **${interaction.guild!.name}**.\nReason: ${reason}`).catch(() => {});

    try {
      await targetMember.kick(reason);
      await prisma.modAction.create({
        data: { guildId: interaction.guildId!, userId: target.id, moderatorId: interaction.user.id, action: 'kick', reason },
      });
      await interaction.reply({ embeds: [successEmbed('User Kicked', `**${target.tag}** has been kicked.\nReason: ${reason}`)] });
    } catch {
      await interaction.reply({ embeds: [errorEmbed('Kick Failed', 'Could not kick this user.')], ephemeral: true });
    }
  },
};
