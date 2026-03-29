import { SlashCommandBuilder, type ChatInputCommandInteraction } from 'discord.js';
import Anthropic from '@anthropic-ai/sdk';
import { config } from '../../lib/config.js';
import { errorEmbed } from '../../lib/embeds.js';
import { logger } from '../../lib/logger.js';

export default {
  data: new SlashCommandBuilder()
    .setName('ask')
    .setDescription('Ask the AI a question')
    .addStringOption(opt => opt.setName('question').setDescription('Your question').setRequired(true)),
  cooldown: 10,
  async execute(interaction: ChatInputCommandInteraction) {
    if (!config.ANTHROPIC_API_KEY) {
      return interaction.reply({ embeds: [errorEmbed('Not Configured', 'AI features are not configured. Set ANTHROPIC_API_KEY.')], ephemeral: true });
    }

    await interaction.deferReply();
    const question = interaction.options.getString('question', true);

    try {
      const anthropic = new Anthropic({ apiKey: config.ANTHROPIC_API_KEY });
      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        messages: [{ role: 'user', content: question }],
      });

      const answer = response.content[0].type === 'text' ? response.content[0].text : 'No response';

      if (answer.length > 2000) {
        await interaction.editReply(answer.slice(0, 1997) + '...');
      } else {
        await interaction.editReply(answer);
      }
    } catch (error) {
      logger.error(error, 'AI API error');
      await interaction.editReply({ embeds: [errorEmbed('AI Error', 'Failed to get a response. Please try again.')] });
    }
  },
};
