import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, type ChatInputCommandInteraction } from 'discord.js';
import { prisma } from '../../lib/database.js';
import { errorEmbed } from '../../lib/embeds.js';

export default {
  data: new SlashCommandBuilder()
    .setName('warnings')
    .setDescription('View warnings for a user')
    .addUserOption(opt => opt.setName('user').setDescription('User to check').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
  async execute(interaction: ChatInputCommandInteraction) {
    const target = interaction.options.getUser('user', true);

    try {
      const warnings = await prisma.modAction.findMany({
        where: { guildId: interaction.guildId!, userId: target.id, action: 'warn' },
        orderBy: { createdAt: 'desc' },
        take: 10,
      });

      if (warnings.length === 0) {
        return interaction.reply({ embeds: [new EmbedBuilder().setColor(0x57F287).setTitle('No Warnings').setDescription(`**${target.tag}** has no warnings.`)] });
      }

      const totalCount = await prisma.modAction.count({
        where: { guildId: interaction.guildId!, userId: target.id, action: 'warn' },
      });

      const embed = new EmbedBuilder()
        .setColor(0xFEE75C)
        .setTitle(`Warnings for ${target.tag}`)
        .setDescription(`Total: **${totalCount}** warning(s)`)
        .setThumbnail(target.displayAvatarURL());

      for (const warn of warnings) {
        const timestamp = Math.floor(warn.createdAt.getTime() / 1000);
        embed.addFields({
          name: `#${warn.id} - <t:${timestamp}:R>`,
          value: `**Reason:** ${warn.reason ?? 'No reason'}\n**By:** <@${warn.moderatorId}>`,
        });
      }

      await interaction.reply({ embeds: [embed] });
    } catch {
      await interaction.reply({ embeds: [errorEmbed('Error', 'Could not fetch warnings.')], ephemeral: true });
    }
  },
};
