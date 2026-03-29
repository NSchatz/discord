import { SlashCommandBuilder, type ChatInputCommandInteraction } from 'discord.js';
import ms from 'ms';
import { prisma } from '../../lib/database.js';
import { successEmbed, errorEmbed } from '../../lib/embeds.js';

export default {
  data: new SlashCommandBuilder()
    .setName('remind')
    .setDescription('Set a reminder')
    .addStringOption(opt => opt.setName('duration').setDescription('When to remind (e.g. 30m, 2h, 1d)').setRequired(true))
    .addStringOption(opt => opt.setName('message').setDescription('Reminder message').setRequired(true)),
  async execute(interaction: ChatInputCommandInteraction) {
    const durationStr = interaction.options.getString('duration', true);
    const message = interaction.options.getString('message', true);
    const durationMs = ms(durationStr as ms.StringValue);

    if (!durationMs || durationMs < 60_000 || durationMs > 30 * 24 * 60 * 60 * 1000) {
      return interaction.reply({ embeds: [errorEmbed('Invalid Duration', 'Duration must be between 1 minute and 30 days.')], ephemeral: true });
    }

    const remindAt = new Date(Date.now() + durationMs);

    try {
      const reminder = await prisma.reminder.create({
        data: {
          userId: interaction.user.id,
          channelId: interaction.channelId,
          guildId: interaction.guildId,
          message,
          remindAt,
        },
      });

      // Schedule if within 24 hours
      if (durationMs < 24 * 60 * 60 * 1000) {
        setTimeout(async () => {
          try {
            const user = await interaction.client.users.fetch(interaction.user.id);
            await user.send(`Reminder: ${message}`).catch(() => {});
            await prisma.reminder.delete({ where: { id: reminder.id } });
          } catch {
            // User not found
          }
        }, durationMs);
      }

      const unix = Math.floor(remindAt.getTime() / 1000);
      await interaction.reply({
        embeds: [successEmbed('Reminder Set', `I'll remind you <t:${unix}:R>.\n**Message:** ${message}`)],
        ephemeral: true,
      });
    } catch {
      await interaction.reply({ embeds: [errorEmbed('Error', 'Could not create reminder.')], ephemeral: true });
    }
  },
};
