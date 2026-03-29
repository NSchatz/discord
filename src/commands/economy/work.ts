import { SlashCommandBuilder, type ChatInputCommandInteraction } from 'discord.js';
import { prisma } from '../../lib/database.js';
import { checkCooldown } from '../../lib/redis.js';
import { successEmbed, errorEmbed } from '../../lib/embeds.js';

const JOBS = [
  'You worked as a programmer and earned', 'You mowed lawns and earned',
  'You delivered pizzas and earned', 'You drove a taxi and earned',
  'You worked at a coffee shop and earned', 'You tutored students and earned',
  'You walked dogs and earned', 'You fixed computers and earned',
  'You painted houses and earned', 'You washed cars and earned',
];

export default {
  data: new SlashCommandBuilder()
    .setName('work')
    .setDescription('Work to earn coins'),
  cooldown: 5,
  async execute(interaction: ChatInputCommandInteraction) {
    const remaining = await checkCooldown(`work:${interaction.guildId}:${interaction.user.id}`, 3600);
    if (remaining > 0) {
      const minutes = Math.ceil(remaining / 60);
      return interaction.reply({ embeds: [errorEmbed('Too Tired', `You can work again in **${minutes}** minutes.`)], ephemeral: true });
    }

    const amount = Math.floor(Math.random() * 201) + 50; // 50-250
    const job = JOBS[Math.floor(Math.random() * JOBS.length)];

    await prisma.$transaction([
      prisma.userEconomy.upsert({
        where: { guildId_userId: { guildId: interaction.guildId!, userId: interaction.user.id } },
        update: { wallet: { increment: amount }, lastWork: new Date() },
        create: { guildId: interaction.guildId!, userId: interaction.user.id, wallet: amount, lastWork: new Date() },
      }),
      prisma.transaction.create({
        data: { guildId: interaction.guildId!, fromId: 'system', toId: interaction.user.id, amount, type: 'work' },
      }),
    ]);

    await interaction.reply({ embeds: [successEmbed('Work Complete', `${job} **${amount.toLocaleString()}** coins!`)] });
  },
};
