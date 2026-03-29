import { SlashCommandBuilder, type ChatInputCommandInteraction } from 'discord.js';
import { prisma } from '../../lib/database.js';
import { successEmbed, errorEmbed } from '../../lib/embeds.js';

export default {
  data: new SlashCommandBuilder()
    .setName('pay')
    .setDescription('Transfer coins to another user')
    .addUserOption(opt => opt.setName('user').setDescription('User to pay').setRequired(true))
    .addIntegerOption(opt => opt.setName('amount').setDescription('Amount to pay').setMinValue(1).setRequired(true)),
  cooldown: 5,
  async execute(interaction: ChatInputCommandInteraction) {
    const target = interaction.options.getUser('user', true);
    const amount = interaction.options.getInteger('amount', true);

    if (target.id === interaction.user.id) {
      return interaction.reply({ embeds: [errorEmbed('Invalid', "You can't pay yourself.")], ephemeral: true });
    }
    if (target.bot) {
      return interaction.reply({ embeds: [errorEmbed('Invalid', "You can't pay bots.")], ephemeral: true });
    }

    try {
      await prisma.$transaction(async (tx) => {
        const sender = await tx.userEconomy.findUnique({
          where: { guildId_userId: { guildId: interaction.guildId!, userId: interaction.user.id } },
        });
        if (!sender || sender.wallet < amount) {
          throw new Error('Insufficient funds');
        }

        await tx.userEconomy.update({
          where: { guildId_userId: { guildId: interaction.guildId!, userId: interaction.user.id } },
          data: { wallet: { decrement: amount } },
        });
        await tx.userEconomy.upsert({
          where: { guildId_userId: { guildId: interaction.guildId!, userId: target.id } },
          update: { wallet: { increment: amount } },
          create: { guildId: interaction.guildId!, userId: target.id, wallet: amount },
        });
        await tx.transaction.create({
          data: { guildId: interaction.guildId!, fromId: interaction.user.id, toId: target.id, amount, type: 'transfer' },
        });
      });

      await interaction.reply({ embeds: [successEmbed('Payment Sent', `You sent **${amount.toLocaleString()}** coins to ${target}.`)] });
    } catch {
      await interaction.reply({ embeds: [errorEmbed('Payment Failed', "You don't have enough coins.")], ephemeral: true });
    }
  },
};
