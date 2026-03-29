import { SlashCommandBuilder, EmbedBuilder, type ChatInputCommandInteraction } from 'discord.js';
import { prisma } from '../../lib/database.js';

export default {
  data: new SlashCommandBuilder()
    .setName('xp-leaderboard')
    .setDescription('View the XP leaderboard')
    .addIntegerOption(opt => opt.setName('page').setDescription('Page number').setMinValue(1)),
  async execute(interaction: ChatInputCommandInteraction) {
    const page = interaction.options.getInteger('page') ?? 1;
    const pageSize = 10;

    await interaction.deferReply();

    const [users, total] = await Promise.all([
      prisma.userLevel.findMany({
        where: { guildId: interaction.guildId! },
        orderBy: { xp: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.userLevel.count({ where: { guildId: interaction.guildId! } }),
    ]);

    const totalPages = Math.ceil(total / pageSize) || 1;
    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle('XP Leaderboard');

    if (users.length === 0) {
      embed.setDescription('No data yet. Start chatting to earn XP!');
    } else {
      const lines: string[] = [];
      for (let i = 0; i < users.length; i++) {
        const rank = (page - 1) * pageSize + i + 1;
        const u = users[i];
        const user = await interaction.client.users.fetch(u.userId).catch(() => null);
        lines.push(`**${rank}.** ${user?.tag ?? u.userId} - Level ${u.level} (${u.xp.toLocaleString()} XP)`);
      }
      embed.setDescription(lines.join('\n'));
    }

    embed.setFooter({ text: `Page ${page} of ${totalPages}` });
    await interaction.editReply({ embeds: [embed] });
  },
};
