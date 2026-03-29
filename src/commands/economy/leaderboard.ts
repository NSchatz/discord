import { SlashCommandBuilder, EmbedBuilder, type ChatInputCommandInteraction } from 'discord.js';
import { prisma } from '../../lib/database.js';

export default {
  data: new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('View the richest users')
    .addIntegerOption(opt => opt.setName('page').setDescription('Page number').setMinValue(1)),
  async execute(interaction: ChatInputCommandInteraction) {
    const page = interaction.options.getInteger('page') ?? 1;
    const pageSize = 10;

    await interaction.deferReply();

    const [users, total] = await Promise.all([
      prisma.userEconomy.findMany({
        where: { guildId: interaction.guildId! },
        orderBy: { wallet: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.userEconomy.count({ where: { guildId: interaction.guildId! } }),
    ]);

    const totalPages = Math.ceil(total / pageSize) || 1;
    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle('Wealth Leaderboard');

    if (users.length === 0) {
      embed.setDescription('No data yet.');
    } else {
      const lines: string[] = [];
      for (let i = 0; i < users.length; i++) {
        const rank = (page - 1) * pageSize + i + 1;
        const u = users[i];
        const totalWealth = u.wallet + u.bank;
        const user = await interaction.client.users.fetch(u.userId).catch(() => null);
        lines.push(`**${rank}.** ${user?.tag ?? u.userId} - ${totalWealth.toLocaleString()} coins`);
      }
      embed.setDescription(lines.join('\n'));
    }

    embed.setFooter({ text: `Page ${page} of ${totalPages}` });
    await interaction.editReply({ embeds: [embed] });
  },
};
