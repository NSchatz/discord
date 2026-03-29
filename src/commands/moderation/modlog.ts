import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, type ChatInputCommandInteraction } from 'discord.js';
import { prisma } from '../../lib/database.js';
import { errorEmbed } from '../../lib/embeds.js';

export default {
  data: new SlashCommandBuilder()
    .setName('modlog')
    .setDescription('View moderation history for a user')
    .addUserOption(opt => opt.setName('user').setDescription('User to check').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
  async execute(interaction: ChatInputCommandInteraction) {
    const target = interaction.options.getUser('user', true);

    try {
      const actions = await prisma.modAction.findMany({
        where: { guildId: interaction.guildId!, userId: target.id },
        orderBy: { createdAt: 'desc' },
        take: 25,
      });

      if (actions.length === 0) {
        return interaction.reply({ embeds: [new EmbedBuilder().setColor(0x57F287).setTitle('Clean Record').setDescription(`**${target.tag}** has no moderation history.`)] });
      }

      const embed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle(`Mod Log: ${target.tag}`)
        .setThumbnail(target.displayAvatarURL());

      for (const action of actions.slice(0, 10)) {
        const timestamp = Math.floor(action.createdAt.getTime() / 1000);
        const duration = action.duration ? ` (${action.duration}s)` : '';
        embed.addFields({
          name: `${action.action.toUpperCase()}${duration} - <t:${timestamp}:R>`,
          value: `**Reason:** ${action.reason ?? 'No reason'}\n**By:** <@${action.moderatorId}>`,
        });
      }

      if (actions.length > 10) {
        embed.setFooter({ text: `Showing 10 of ${actions.length} actions` });
      }

      await interaction.reply({ embeds: [embed] });
    } catch {
      await interaction.reply({ embeds: [errorEmbed('Error', 'Could not fetch mod log.')], ephemeral: true });
    }
  },
};
