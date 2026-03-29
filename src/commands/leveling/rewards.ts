import { SlashCommandBuilder, EmbedBuilder, type ChatInputCommandInteraction } from 'discord.js';
import { prisma } from '../../lib/database.js';

export default {
  data: new SlashCommandBuilder()
    .setName('rewards')
    .setDescription('View level-up role rewards'),
  async execute(interaction: ChatInputCommandInteraction) {
    const rewards = await prisma.levelReward.findMany({
      where: { guildId: interaction.guildId! },
      orderBy: { level: 'asc' },
    });

    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle('Level Rewards');

    if (rewards.length === 0) {
      embed.setDescription('No rewards configured. Admins can add them with `/config rewards add`.');
    } else {
      const lines = rewards.map(r => `**Level ${r.level}** - <@&${r.roleId}>`);
      embed.setDescription(lines.join('\n'));
    }

    await interaction.reply({ embeds: [embed] });
  },
};
