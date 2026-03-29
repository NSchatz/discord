import { type ButtonInteraction, EmbedBuilder } from 'discord.js';
import { prisma } from '../../lib/database.js';
import { logger } from '../../lib/logger.js';

export default async function handlePollButton(interaction: ButtonInteraction) {
  const parts = interaction.customId.split(':');
  if (parts[1] !== 'vote') return;

  const pollId = parts[2];
  const optionIndex = parts[3];

  try {
    const poll = await prisma.poll.findUnique({ where: { id: pollId } });
    if (!poll) {
      return interaction.reply({ content: 'This poll no longer exists.', ephemeral: true });
    }

    const votes = (poll.votes as Record<string, string[]>) ?? {};
    const userId = interaction.user.id;

    // Check if user already voted for this option (for toggle behavior)
    const alreadyVoted = (votes[optionIndex] ?? []).includes(userId);

    // Remove existing vote from all options
    for (const key of Object.keys(votes)) {
      votes[key] = (votes[key] ?? []).filter(id => id !== userId);
    }

    // Add vote if not toggling off
    if (!alreadyVoted) {
      if (!votes[optionIndex]) votes[optionIndex] = [];
      votes[optionIndex].push(userId);
    }

    await prisma.poll.update({ where: { id: pollId }, data: { votes } });

    const numberEmojis = ['1\u20E3', '2\u20E3', '3\u20E3', '4\u20E3', '5\u20E3'];
    const description = `**${poll.question}**\n\n` +
      poll.options.map((opt, i) => {
        const count = (votes[i.toString()] ?? []).length;
        return `${numberEmojis[i]} ${opt} - **${count}** vote${count !== 1 ? 's' : ''}`;
      }).join('\n');

    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle('Poll')
      .setDescription(description)
      .setFooter({ text: `Poll ID: ${poll.id}` })
      .setTimestamp(poll.createdAt);

    await interaction.update({ embeds: [embed] });
  } catch (error) {
    logger.error(error, 'Poll vote error');
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({ content: 'Something went wrong.', ephemeral: true }).catch(() => {});
    }
  }
}
