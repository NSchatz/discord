import { SlashCommandBuilder, EmbedBuilder, type ChatInputCommandInteraction } from 'discord.js';
import { searchTrack, formatDuration, popularityBar, isSpotifyConfigured } from '../../lib/spotify.js';
import { errorEmbed } from '../../lib/embeds.js';

export default {
  data: new SlashCommandBuilder()
    .setName('track')
    .setDescription('Look up a track on Spotify')
    .addStringOption(opt => opt.setName('name').setDescription('Track name (optionally include artist)').setRequired(true)),
  cooldown: 5,
  async execute(interaction: ChatInputCommandInteraction) {
    if (!isSpotifyConfigured()) {
      return interaction.reply({ embeds: [errorEmbed('Not Configured', 'Spotify API credentials are not set up.')], ephemeral: true });
    }

    await interaction.deferReply();
    const query = interaction.options.getString('name', true);

    try {
      const track = await searchTrack(query);
      if (!track) {
        return interaction.editReply({ embeds: [errorEmbed('Not Found', `No track found for "${query}".`)] });
      }

      const artists = track.artists.map(a => `[${a.name}](${a.external_urls.spotify})`).join(', ');

      const embed = new EmbedBuilder()
        .setColor(0x1DB954)
        .setTitle(track.name)
        .setURL(track.external_urls.spotify)
        .setThumbnail(track.album.images[0]?.url ?? null)
        .addFields(
          { name: 'Artist(s)', value: artists, inline: true },
          { name: 'Album', value: `[${track.album.name}](${track.album.external_urls.spotify})`, inline: true },
          { name: 'Duration', value: formatDuration(track.duration_ms), inline: true },
          { name: 'Popularity', value: popularityBar(track.popularity), inline: false },
          { name: 'Released', value: track.album.release_date, inline: true },
        )
        .setFooter({ text: 'Data from Spotify' });

      if (track.preview_url) {
        embed.addFields({ name: 'Preview', value: `[Listen to 30s preview](${track.preview_url})` });
      }

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      await interaction.editReply({ embeds: [errorEmbed('Error', 'Failed to fetch track data.')] });
    }
  },
};
