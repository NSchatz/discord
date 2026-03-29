import { SlashCommandBuilder, type ChatInputCommandInteraction } from 'discord.js';
import { prisma } from '../../lib/database.js';
import { successEmbed, errorEmbed } from '../../lib/embeds.js';

export default {
  data: new SlashCommandBuilder()
    .setName('withdraw')
    .setDescription('Withdraw coins from your bank')
    .addStringOption(opt => opt.setName('amount').setDescription('Amount to withdraw (or "all")').setRequired(true)),
  async execute(interaction: ChatInputCommandInteraction) {
    const amountStr = interaction.options.getString('amount', true);

    const account = await prisma.userEconomy.upsert({
      where: { guildId_userId: { guildId: interaction.guildId!, userId: interaction.user.id } },
      update: {},
      create: { guildId: interaction.guildId!, userId: interaction.user.id },
    });

    let amount: number;
    if (amountStr.toLowerCase() === 'all') {
      amount = account.bank;
    } else {
      amount = parseInt(amountStr, 10);
      if (isNaN(amount) || amount < 1) {
        return interaction.reply({ embeds: [errorEmbed('Invalid', 'Enter a valid number or "all".')], ephemeral: true });
      }
    }

    if (amount <= 0 || account.bank < amount) {
      return interaction.reply({ embeds: [errorEmbed('Insufficient Funds', "You don't have enough coins in your bank.")], ephemeral: true });
    }

    await prisma.userEconomy.update({
      where: { guildId_userId: { guildId: interaction.guildId!, userId: interaction.user.id } },
      data: { wallet: { increment: amount }, bank: { decrement: amount } },
    });

    await interaction.reply({ embeds: [successEmbed('Withdrawn', `Withdrew **${amount.toLocaleString()}** coins from your bank.`)] });
  },
};
