import { SlashCommandBuilder, PermissionFlagsBits, type ChatInputCommandInteraction } from 'discord.js';
import { prisma, getGuildConfig } from '../../lib/database.js';
import { successEmbed, errorEmbed } from '../../lib/embeds.js';

export default {
  data: new SlashCommandBuilder()
    .setName('warn')
    .setDescription('Issue a warning to a user')
    .addUserOption(opt => opt.setName('user').setDescription('User to warn').setRequired(true))
    .addStringOption(opt => opt.setName('reason').setDescription('Reason for the warning').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
  async execute(interaction: ChatInputCommandInteraction) {
    const target = interaction.options.getUser('user', true);
    const reason = interaction.options.getString('reason', true);

    try {
      await prisma.modAction.create({
        data: { guildId: interaction.guildId!, userId: target.id, moderatorId: interaction.user.id, action: 'warn', reason },
      });

      const warnCount = await prisma.modAction.count({
        where: { guildId: interaction.guildId!, userId: target.id, action: 'warn' },
      });

      const guildConfig = await getGuildConfig(interaction.guildId!);
      let escalation = '';

      // Auto-escalation
      if (warnCount >= guildConfig.warnThresholdBan) {
        const targetMember = await interaction.guild!.members.fetch(target.id).catch(() => null);
        if (targetMember) {
          await interaction.guild!.members.ban(target, { reason: `Auto-ban: ${warnCount} warnings reached` }).catch(() => {});
          escalation = `\n**Auto-ban triggered** (${warnCount} warnings)`;
        }
      } else if (warnCount >= guildConfig.warnThresholdTimeout) {
        const targetMember = await interaction.guild!.members.fetch(target.id).catch(() => null);
        if (targetMember) {
          await targetMember.timeout(3_600_000, `Auto-timeout: ${warnCount} warnings reached`).catch(() => {});
          escalation = `\n**Auto-timeout triggered** (${warnCount} warnings, 1 hour)`;
        }
      }

      await target.send(`You have been warned in **${interaction.guild!.name}**.\nReason: ${reason}\nTotal warnings: ${warnCount}`).catch(() => {});

      await interaction.reply({
        embeds: [successEmbed('Warning Issued', `**${target.tag}** has been warned.\nReason: ${reason}\nTotal warnings: **${warnCount}**${escalation}`)],
      });
    } catch {
      await interaction.reply({ embeds: [errorEmbed('Warning Failed', 'Could not issue warning.')], ephemeral: true });
    }
  },
};
