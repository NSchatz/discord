import { SlashCommandBuilder, EmbedBuilder, type ChatInputCommandInteraction } from 'discord.js';
import { getQueue } from '../../lib/queue.js';

export default {
  data: new SlashCommandBuilder()
    .setName('nowplaying')
    .setDescription('Show the currently playing track'),
  async execute(interaction: ChatInputCommandInteraction) {
    const queue = getQueue(interaction.guildId!);
    if (!queue || !queue.current) return interaction.reply({ content: 'Nothing is playing.', ephemeral: true });

    const track = queue.current;
    const position = queue.player.position;
    const duration = track.info.length;

    // Text progress bar
    const barLength = 20;
    const filled = Math.round((position / duration) * barLength);
    const bar = '\u2588'.repeat(filled) + '\u2591'.repeat(barLength - filled);

    const formatTime = (ms: number) => {
      const s = Math.floor(ms / 1000);
      const m = Math.floor(s / 60);
      const sec = s % 60;
      return `${m}:${sec.toString().padStart(2, '0')}`;
    };

    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle('Now Playing')
      .setDescription(`**${track.info.title}**\nby ${track.info.author}`)
      .addFields(
        { name: 'Progress', value: `${bar}\n${formatTime(position)} / ${formatTime(duration)}` },
        { name: 'Loop', value: queue.loop, inline: true },
        { name: 'Volume', value: `${queue.volume}%`, inline: true },
      );

    if (track.info.uri) embed.setURL(track.info.uri);
    await interaction.reply({ embeds: [embed] });
  },
};
