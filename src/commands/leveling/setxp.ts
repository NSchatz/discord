import { SlashCommandBuilder, PermissionFlagsBits, type ChatInputCommandInteraction } from 'discord.js';
import { prisma } from '../../lib/database.js';
import { levelFromTotalXp } from '../../lib/xp.js';
import { successEmbed, errorEmbed } from '../../lib/embeds.js';

export default {
  data: new SlashCommandBuilder()
    .setName('setxp')
    .setDescription('Set a user\'s XP (admin)')
    .addUserOption(opt => opt.setName('user').setDescription('Target user').setRequired(true))
    .addIntegerOption(opt => opt.setName('amount').setDescription('XP amount').setMinValue(0).setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  async execute(interaction: ChatInputCommandInteraction) {
    const user = interaction.options.getUser('user', true);
    const amount = interaction.options.getInteger('amount', true);
    const newLevel = levelFromTotalXp(amount);

    try {
      await prisma.userLevel.upsert({
        where: { guildId_userId: { guildId: interaction.guildId!, userId: user.id } },
        update: { xp: amount, level: newLevel },
        create: { guildId: interaction.guildId!, userId: user.id, xp: amount, level: newLevel },
      });

      await interaction.reply({ embeds: [successEmbed('XP Updated', `Set **${user.tag}**'s XP to **${amount.toLocaleString()}** (Level ${newLevel}).`)] });
    } catch {
      await interaction.reply({ embeds: [errorEmbed('Error', 'Could not update XP.')], ephemeral: true });
    }
  },
};
