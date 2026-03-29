import { SlashCommandBuilder, EmbedBuilder, type ChatInputCommandInteraction } from 'discord.js';
import { prisma } from '../../lib/database.js';

export default {
  data: new SlashCommandBuilder()
    .setName('shop')
    .setDescription('View the shop'),
  async execute(interaction: ChatInputCommandInteraction) {
    const items = await prisma.shopItem.findMany({
      where: { guildId: interaction.guildId! },
      orderBy: { price: 'asc' },
      take: 10,
    });

    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle('Shop');

    if (items.length === 0) {
      embed.setDescription('The shop is empty. An admin can add items with `/config`.');
    } else {
      const lines = items.map((item, i) =>
        `**${i + 1}. ${item.name}** - ${item.price.toLocaleString()} coins\n${item.description}${item.roleId ? ` | Grants <@&${item.roleId}>` : ''}`
      );
      embed.setDescription(lines.join('\n\n'));
    }

    await interaction.reply({ embeds: [embed] });
  },
};
