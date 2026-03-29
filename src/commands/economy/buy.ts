import { SlashCommandBuilder, type ChatInputCommandInteraction, type GuildMember } from 'discord.js';
import { prisma } from '../../lib/database.js';
import { successEmbed, errorEmbed } from '../../lib/embeds.js';

export default {
  data: new SlashCommandBuilder()
    .setName('buy')
    .setDescription('Buy an item from the shop')
    .addStringOption(opt => opt.setName('item').setDescription('Item name').setRequired(true))
    .addIntegerOption(opt => opt.setName('quantity').setDescription('Quantity').setMinValue(1)),
  async execute(interaction: ChatInputCommandInteraction) {
    const itemName = interaction.options.getString('item', true);
    const quantity = interaction.options.getInteger('quantity') ?? 1;

    const item = await prisma.shopItem.findFirst({
      where: { guildId: interaction.guildId!, name: { equals: itemName, mode: 'insensitive' } },
    });

    if (!item) {
      return interaction.reply({ embeds: [errorEmbed('Not Found', 'Item not found in the shop.')], ephemeral: true });
    }

    const totalCost = item.price * quantity;

    try {
      await prisma.$transaction(async (tx) => {
        const account = await tx.userEconomy.findUnique({
          where: { guildId_userId: { guildId: interaction.guildId!, userId: interaction.user.id } },
        });
        if (!account || account.wallet < totalCost) {
          throw new Error('Insufficient funds');
        }

        await tx.userEconomy.update({
          where: { guildId_userId: { guildId: interaction.guildId!, userId: interaction.user.id } },
          data: { wallet: { decrement: totalCost } },
        });

        await tx.inventory.upsert({
          where: { guildId_userId_itemId: { guildId: interaction.guildId!, userId: interaction.user.id, itemId: item.id } },
          update: { quantity: { increment: quantity } },
          create: { guildId: interaction.guildId!, userId: interaction.user.id, itemId: item.id, quantity },
        });

        await tx.transaction.create({
          data: { guildId: interaction.guildId!, fromId: interaction.user.id, toId: 'shop', amount: totalCost, type: 'shop' },
        });
      });

      // Grant role if applicable
      if (item.roleId) {
        const member = interaction.member as GuildMember;
        await member.roles.add(item.roleId).catch(() => {});
      }

      await interaction.reply({ embeds: [successEmbed('Purchase Complete', `Bought **${quantity}x ${item.name}** for **${totalCost.toLocaleString()}** coins.`)] });
    } catch {
      await interaction.reply({ embeds: [errorEmbed('Purchase Failed', "You don't have enough coins.")], ephemeral: true });
    }
  },
};
