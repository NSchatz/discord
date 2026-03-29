import { SlashCommandBuilder, ChannelType, type ChatInputCommandInteraction, type TextChannel } from 'discord.js';
import Anthropic from '@anthropic-ai/sdk';
import { config } from '../../lib/config.js';
import { errorEmbed } from '../../lib/embeds.js';
import { logger } from '../../lib/logger.js';

export default {
  data: new SlashCommandBuilder()
    .setName('chat')
    .setDescription('Start an AI conversation thread'),
  cooldown: 30,
  async execute(interaction: ChatInputCommandInteraction) {
    if (!config.ANTHROPIC_API_KEY) {
      return interaction.reply({ embeds: [errorEmbed('Not Configured', 'AI features are not configured. Set ANTHROPIC_API_KEY.')], ephemeral: true });
    }
    if (!interaction.channel || !('threads' in interaction.channel)) {
      return interaction.reply({ embeds: [errorEmbed('Invalid Channel', 'This command can only be used in a text channel.')], ephemeral: true });
    }

    await interaction.deferReply();

    const thread = await (interaction.channel as TextChannel).threads.create({
      name: `Chat with ${interaction.user.displayName}`,
      autoArchiveDuration: 60,
      reason: 'AI conversation thread',
    });

    await interaction.editReply(`Started a conversation: ${thread}`);

    const anthropic = new Anthropic({ apiKey: config.ANTHROPIC_API_KEY });
    const history: Array<{ role: 'user' | 'assistant'; content: string }> = [];

    const collector = thread.createMessageCollector({
      filter: (m) => !m.author.bot,
      idle: 300_000,
    });

    collector.on('collect', async (message) => {
      history.push({ role: 'user', content: message.content });
      const trimmed = history.slice(-20);

      try {
        if ('sendTyping' in message.channel) await message.channel.sendTyping();
        const response = await anthropic.messages.create({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1024,
          system: 'You are a helpful assistant in a Discord server. Keep responses concise.',
          messages: trimmed,
        });

        const answer = response.content[0].type === 'text' ? response.content[0].text : '';
        history.push({ role: 'assistant', content: answer });

        if (answer.length > 2000) {
          for (let i = 0; i < answer.length; i += 2000) {
            await thread.send(answer.slice(i, i + 2000));
          }
        } else {
          await thread.send(answer || 'No response.');
        }
      } catch (error) {
        logger.error(error, 'AI chat error');
        await thread.send('Sorry, I encountered an error.').catch(() => {});
      }
    });

    collector.on('end', () => {
      thread.send('This conversation has been closed due to inactivity.').catch(() => {});
    });
  },
};
