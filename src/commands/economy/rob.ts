import { SlashCommandBuilder, type ChatInputCommandInteraction } from 'discord.js';
import { prisma } from '../../lib/database.js';
import { checkCooldown } from '../../lib/redis.js';
import { successEmbed, errorEmbed } from '../../lib/embeds.js';

export default {
  data: new SlashCommandBuilder()
    .setName('rob')
    .setDescription('Attempt to steal coins from someone')
    .addUserOption(opt => opt.setName('user').setDescription('User to rob').setRequired(true)),
  cooldown: 10,
  async execute(interaction: ChatInputCommandInteraction) {
    const target = interaction.options.getUser('user', true);

    if (target.id === interaction.user.id) return interaction.reply({ embeds: [errorEmbed('Invalid', "You can't rob yourself.")], ephemeral: true });
    if (target.bot) return interaction.reply({ embeds: [errorEmbed('Invalid', "You can't rob bots.")], ephemeral: true });

    const remaining = await checkCooldown(`rob:${interaction.guildId}:${interaction.user.id}`, 7200);
    if (remaining > 0) {
      const hours = Math.floor(remaining / 3600);
      const minutes = Math.floor((remaining % 3600) / 60);
      return interaction.reply({ embeds: [errorEmbed('Cooldown', `Try again in **${hours}h ${minutes}m**.`)], ephemeral: true });
    }

    try {
      await prisma.$transaction(async (tx) => {
        const [robber, victim] = await Promise.all([
          tx.userEconomy.upsert({
            where: { guildId_userId: { guildId: interaction.guildId!, userId: interaction.user.id } },
            update: {}, create: { guildId: interaction.guildId!, userId: interaction.user.id },
          }),
          tx.userEconomy.upsert({
            where: { guildId_userId: { guildId: interaction.guildId!, userId: target.id } },
            update: {}, create: { guildId: interaction.guildId!, userId: target.id },
          }),
        ]);

        if (victim.wallet <= 0) throw new Error('empty');

        const success = Math.random() < 0.4; // 40% success
        if (success) {
          const percent = (Math.random() * 0.2 + 0.1); // 10-30%
          const stolen = Math.floor(victim.wallet * percent);
          await tx.userEconomy.update({ where: { guildId_userId: { guildId: interaction.guildId!, userId: interaction.user.id } }, data: { wallet: { increment: stolen } } });
          await tx.userEconomy.update({ where: { guildId_userId: { guildId: interaction.guildId!, userId: target.id } }, data: { wallet: { decrement: stolen } } });
          await tx.transaction.create({ data: { guildId: interaction.guildId!, fromId: target.id, toId: interaction.user.id, amount: stolen, type: 'rob' } });
          await interaction.reply({ embeds: [successEmbed('Robbery Successful', `You stole **${stolen.toLocaleString()}** coins from ${target}!`)] });
        } else {
          const fine = Math.floor(robber.wallet * 0.1);
          if (fine > 0) {
            await tx.userEconomy.update({ where: { guildId_userId: { guildId: interaction.guildId!, userId: interaction.user.id } }, data: { wallet: { decrement: fine } } });
            await tx.userEconomy.update({ where: { guildId_userId: { guildId: interaction.guildId!, userId: target.id } }, data: { wallet: { increment: fine } } });
          }
          await interaction.reply({ embeds: [errorEmbed('Caught!', `You were caught and fined **${fine.toLocaleString()}** coins!`)] });
        }
      });
    } catch (err) {
      if (err instanceof Error && err.message === 'empty') {
        await interaction.reply({ embeds: [errorEmbed('Empty Pockets', 'This user has nothing to steal.')], ephemeral: true });
      } else {
        await interaction.reply({ embeds: [errorEmbed('Error', 'Could not complete the robbery.')], ephemeral: true });
      }
    }
  },
};
