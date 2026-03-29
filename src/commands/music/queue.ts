import { SlashCommandBuilder, EmbedBuilder, type ChatInputCommandInteraction } from 'discord.js';
import { getQueue } from '../../lib/queue.js';

export default {
  data: new SlashCommandBuilder()
    .setName('queue')
    .setDescription('Show the music queue')
    .addIntegerOption(opt => opt.setName('page').setDescription('Page number').setMinValue(1)),
  async execute(interaction: ChatInputCommandInteraction) {
    const queue = getQueue(interaction.guildId!);
    if (!queue) return interaction.reply({ content: 'Nothing is playing.', ephemeral: true });

    const page = interaction.options.getInteger('page') ?? 1;
    const pageSize = 10;
    const totalPages = Math.ceil(queue.tracks.length / pageSize) || 1;

    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle('Music Queue');

    if (queue.current) {
      embed.setDescription(`**Now Playing:** ${queue.current.info.title}\n\n`);
    }

    if (queue.tracks.length === 0) {
      embed.setDescription((embed.data.description ?? '') + 'Queue is empty.');
    } else {
      const start = (page - 1) * pageSize;
      const tracks = queue.tracks.slice(start, start + pageSize);
      const lines = tracks.map((t, i) => `**${start + i + 1}.** ${t.info.title}`);
      embed.setDescription((embed.data.description ?? '') + lines.join('\n'));
    }

    embed.setFooter({ text: `Page ${page}/${totalPages} | ${queue.tracks.length} tracks | Loop: ${queue.loop}` });
    await interaction.reply({ embeds: [embed] });
  },
};
