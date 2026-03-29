import { SlashCommandBuilder, type ChatInputCommandInteraction } from 'discord.js';
import { prisma } from '../../lib/database.js';
import { successEmbed, errorEmbed } from '../../lib/embeds.js';

export default {
  data: new SlashCommandBuilder()
    .setName('gamble')
    .setDescription('Gamble your coins on a coin flip')
    .addIntegerOption(opt => opt.setName('amount').setDescription('Amount to gamble').setMinValue(1).setRequired(true)),
  cooldown: 5,
  async execute(interaction: ChatInputCommandInteraction) {
    const amount = interaction.options.getInteger('amount', true);

    try {
      await prisma.$transaction(async (tx) => {
        const account = await tx.userEconomy.findUnique({
          where: { guildId_userId: { guildId: interaction.guildId!, userId: interaction.user.id } },
        });
        if (!account || account.wallet < amount) throw new Error('Insufficient funds');

        const won = Math.random() < 0.45; // 45% win rate
        const change = won ? amount : -amount;

        await tx.userEconomy.update({
          where: { guildId_userId: { guildId: interaction.guildId!, userId: interaction.user.id } },
          data: { wallet: { increment: change } },
        });
        await tx.transaction.create({
          data: { guildId: interaction.guildId!, fromId: interaction.user.id, toId: won ? interaction.user.id : 'house', amount, type: 'gamble' },
        });

        if (won) {
          await interaction.reply({ embeds: [successEmbed('You Won!', `You won **${amount.toLocaleString()}** coins! New balance: **${(account.wallet + amount).toLocaleString()}**`)] });
        } else {
          await interaction.reply({ embeds: [errorEmbed('You Lost!', `You lost **${amount.toLocaleString()}** coins. New balance: **${(account.wallet - amount).toLocaleString()}**`)] });
        }
      });
    } catch {
      await interaction.reply({ embeds: [errorEmbed('Gamble Failed', "You don't have enough coins.")], ephemeral: true });
    }
  },
};
