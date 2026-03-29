import { SlashCommandBuilder, type ChatInputCommandInteraction } from 'discord.js';
import { prisma } from '../../lib/database.js';
import { checkCooldown } from '../../lib/redis.js';
import { successEmbed, errorEmbed } from '../../lib/embeds.js';

export default {
  data: new SlashCommandBuilder()
    .setName('daily')
    .setDescription('Claim your daily reward'),
  cooldown: 5,
  async execute(interaction: ChatInputCommandInteraction) {
    const remaining = await checkCooldown(`daily:${interaction.guildId}:${interaction.user.id}`, 86400);
    if (remaining > 0) {
      const hours = Math.floor(remaining / 3600);
      const minutes = Math.floor((remaining % 3600) / 60);
      return interaction.reply({ embeds: [errorEmbed('Already Claimed', `Try again in **${hours}h ${minutes}m**.`)], ephemeral: true });
    }

    const amount = Math.floor(Math.random() * 401) + 100; // 100-500

    await prisma.$transaction([
      prisma.userEconomy.upsert({
        where: { guildId_userId: { guildId: interaction.guildId!, userId: interaction.user.id } },
        update: { wallet: { increment: amount }, lastDaily: new Date() },
        create: { guildId: interaction.guildId!, userId: interaction.user.id, wallet: amount, lastDaily: new Date() },
      }),
      prisma.transaction.create({
        data: { guildId: interaction.guildId!, fromId: 'system', toId: interaction.user.id, amount, type: 'daily' },
      }),
    ]);

    await interaction.reply({ embeds: [successEmbed('Daily Reward', `You received **${amount.toLocaleString()}** coins!`)] });
  },
};
