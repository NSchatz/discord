import { SlashCommandBuilder, type ChatInputCommandInteraction } from 'discord.js';
import { prisma } from '../../lib/database.js';
import { successEmbed, errorEmbed } from '../../lib/embeds.js';

export default {
  data: new SlashCommandBuilder()
    .setName('deposit')
    .setDescription('Deposit coins into your bank')
    .addStringOption(opt => opt.setName('amount').setDescription('Amount to deposit (or "all")').setRequired(true)),
  async execute(interaction: ChatInputCommandInteraction) {
    const amountStr = interaction.options.getString('amount', true);

    const account = await prisma.userEconomy.upsert({
      where: { guildId_userId: { guildId: interaction.guildId!, userId: interaction.user.id } },
      update: {},
      create: { guildId: interaction.guildId!, userId: interaction.user.id },
    });

    const bankSpace = account.bankMax - account.bank;
    let amount: number;

    if (amountStr.toLowerCase() === 'all') {
      amount = Math.min(account.wallet, bankSpace);
    } else {
      amount = parseInt(amountStr, 10);
      if (isNaN(amount) || amount < 1) {
        return interaction.reply({ embeds: [errorEmbed('Invalid', 'Enter a valid number or "all".')], ephemeral: true });
      }
    }

    if (amount <= 0 || account.wallet < amount) {
      return interaction.reply({ embeds: [errorEmbed('Insufficient Funds', "You don't have enough coins in your wallet.")], ephemeral: true });
    }
    if (amount > bankSpace) {
      return interaction.reply({ embeds: [errorEmbed('Bank Full', `You can only deposit **${bankSpace.toLocaleString()}** more coins.`)], ephemeral: true });
    }

    await prisma.userEconomy.update({
      where: { guildId_userId: { guildId: interaction.guildId!, userId: interaction.user.id } },
      data: { wallet: { decrement: amount }, bank: { increment: amount } },
    });

    await interaction.reply({ embeds: [successEmbed('Deposited', `Deposited **${amount.toLocaleString()}** coins into your bank.`)] });
  },
};
