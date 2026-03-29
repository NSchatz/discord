import { SlashCommandBuilder, EmbedBuilder, type ChatInputCommandInteraction } from 'discord.js';
import { prisma } from '../../lib/database.js';

export default {
  data: new SlashCommandBuilder()
    .setName('inventory')
    .setDescription('View your inventory')
    .addUserOption(opt => opt.setName('user').setDescription('User to check')),
  async execute(interaction: ChatInputCommandInteraction) {
    const user = interaction.options.getUser('user') ?? interaction.user;

    const items = await prisma.inventory.findMany({
      where: { guildId: interaction.guildId!, userId: user.id },
    });

    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle(`${user.username}'s Inventory`);

    if (items.length === 0) {
      embed.setDescription('Inventory is empty.');
    } else {
      const itemIds = items.map(i => i.itemId);
      const shopItems = await prisma.shopItem.findMany({ where: { id: { in: itemIds } } });
      const itemMap = new Map(shopItems.map(i => [i.id, i]));

      const lines = items.map(inv => {
        const item = itemMap.get(inv.itemId);
        return `**${item?.name ?? 'Unknown'}** x${inv.quantity}`;
      });
      embed.setDescription(lines.join('\n'));
    }

    await interaction.reply({ embeds: [embed] });
  },
};
