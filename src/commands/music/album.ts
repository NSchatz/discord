import { SlashCommandBuilder, EmbedBuilder, type ChatInputCommandInteraction } from 'discord.js';
import { searchAlbum, formatDuration, isSpotifyConfigured } from '../../lib/spotify.js';
import { errorEmbed } from '../../lib/embeds.js';

export default {
  data: new SlashCommandBuilder()
    .setName('album')
    .setDescription('Look up an album on Spotify')
    .addStringOption(opt => opt.setName('name').setDescription('Album name (optionally include artist)').setRequired(true)),
  cooldown: 5,
  async execute(interaction: ChatInputCommandInteraction) {
    if (!isSpotifyConfigured()) {
      return interaction.reply({ embeds: [errorEmbed('Not Configured', 'Spotify API credentials are not set up.')], ephemeral: true });
    }

    await interaction.deferReply();
    const query = interaction.options.getString('name', true);

    try {
      const album = await searchAlbum(query);
      if (!album) {
        return interaction.editReply({ embeds: [errorEmbed('Not Found', `No album found for "${query}".`)] });
      }

      const artists = album.artists.map(a => `[${a.name}](${a.external_urls.spotify})`).join(', ');
      const totalDuration = album.tracks.items.reduce((sum, t) => sum + t.duration_ms, 0);

      const tracklist = album.tracks.items
        .slice(0, 15)
        .map(t => `**${t.track_number}.** ${t.name} \u2014 ${formatDuration(t.duration_ms)}`)
        .join('\n');

      const remaining = album.total_tracks - 15;

      const embed = new EmbedBuilder()
        .setColor(0x1DB954)
        .setTitle(album.name)
        .setURL(album.external_urls.spotify)
        .setThumbnail(album.images[0]?.url ?? null)
        .addFields(
          { name: 'Artist(s)', value: artists, inline: true },
          { name: 'Released', value: album.release_date, inline: true },
          { name: 'Tracks', value: `${album.total_tracks} (${formatDuration(totalDuration)} total)`, inline: true },
          { name: 'Label', value: album.label || 'Unknown', inline: true },
        )
        .setFooter({ text: 'Data from Spotify' });

      if (tracklist) {
        const tracklistValue = remaining > 0
          ? `${tracklist}\n*...and ${remaining} more*`
          : tracklist;
        embed.addFields({ name: 'Tracklist', value: tracklistValue });
      }

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      await interaction.editReply({ embeds: [errorEmbed('Error', 'Failed to fetch album data.')] });
    }
  },
};
