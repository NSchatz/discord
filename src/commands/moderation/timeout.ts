import { SlashCommandBuilder, PermissionFlagsBits, type ChatInputCommandInteraction, type GuildMember } from 'discord.js';
import ms from 'ms';
import { prisma } from '../../lib/database.js';
import { successEmbed, errorEmbed } from '../../lib/embeds.js';
import { canModerate } from '../../lib/permissions.js';

export default {
  data: new SlashCommandBuilder()
    .setName('timeout')
    .setDescription('Timeout a user')
    .addUserOption(opt => opt.setName('user').setDescription('User to timeout').setRequired(true))
    .addStringOption(opt => opt.setName('duration').setDescription('Duration (e.g. 30m, 2h, 7d)').setRequired(true))
    .addStringOption(opt => opt.setName('reason').setDescription('Reason for the timeout'))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
  async execute(interaction: ChatInputCommandInteraction) {
    const target = interaction.options.getUser('user', true);
    const durationStr = interaction.options.getString('duration', true);
    const reason = interaction.options.getString('reason') ?? 'No reason provided';
    const botMember = interaction.guild!.members.me!;
    const member = interaction.member as GuildMember;

    const durationMs = ms(durationStr as ms.StringValue);
    if (!durationMs || durationMs < 1000 || durationMs > 2_419_200_000) {
      return interaction.reply({ embeds: [errorEmbed('Invalid Duration', 'Duration must be between 1 second and 28 days.')], ephemeral: true });
    }

    const targetMember = await interaction.guild!.members.fetch(target.id).catch(() => null);
    if (!targetMember) {
      return interaction.reply({ embeds: [errorEmbed('Not Found', 'User is not in this server.')], ephemeral: true });
    }
    if (!canModerate(botMember, targetMember)) {
      return interaction.reply({ embeds: [errorEmbed('Cannot Timeout', 'This user has a higher or equal role than me.')], ephemeral: true });
    }
    if (targetMember.roles.highest.position >= member.roles.highest.position) {
      return interaction.reply({ embeds: [errorEmbed('Cannot Timeout', 'This user has a higher or equal role than you.')], ephemeral: true });
    }

    try {
      await targetMember.timeout(durationMs, reason);
      await prisma.modAction.create({
        data: {
          guildId: interaction.guildId!, userId: target.id, moderatorId: interaction.user.id,
          action: 'timeout', reason, duration: Math.round(durationMs / 1000),
        },
      });
      await interaction.reply({ embeds: [successEmbed('User Timed Out', `**${target.tag}** has been timed out for ${durationStr}.\nReason: ${reason}`)] });
    } catch {
      await interaction.reply({ embeds: [errorEmbed('Timeout Failed', 'Could not timeout this user.')], ephemeral: true });
    }
  },
};
