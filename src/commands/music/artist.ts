import { SlashCommandBuilder, EmbedBuilder, type ChatInputCommandInteraction } from 'discord.js';
import { searchArtist, getArtistTopTracks, formatNumber, popularityBar, isSpotifyConfigured } from '../../lib/spotify.js';
import { errorEmbed } from '../../lib/embeds.js';

export default {
  data: new SlashCommandBuilder()
    .setName('artist')
    .setDescription('Look up an artist on Spotify')
    .addStringOption(opt => opt.setName('name').setDescription('Artist name').setRequired(true)),
  cooldown: 5,
  async execute(interaction: ChatInputCommandInteraction) {
    if (!isSpotifyConfigured()) {
      return interaction.reply({ embeds: [errorEmbed('Not Configured', 'Spotify API credentials are not set up.')], ephemeral: true });
    }

    await interaction.deferReply();
    const query = interaction.options.getString('name', true);

    try {
      const artist = await searchArtist(query);
      if (!artist) {
        return interaction.editReply({ embeds: [errorEmbed('Not Found', `No artist found for "${query}".`)] });
      }

      const topTracks = await getArtistTopTracks(artist.id);
      const topTracksList = topTracks
        .slice(0, 5)
        .map((t, i) => `**${i + 1}.** [${t.name}](${t.external_urls.spotify}) \u2014 ${formatNumber(t.popularity)}% popularity`)
        .join('\n');

      const embed = new EmbedBuilder()
        .setColor(0x1DB954)
        .setTitle(artist.name)
        .setURL(artist.external_urls.spotify)
        .setThumbnail(artist.images[0]?.url ?? null)
        .addFields(
          { name: 'Followers', value: formatNumber(artist.followers.total), inline: true },
          { name: 'Popularity', value: popularityBar(artist.popularity), inline: true },
          { name: 'Genres', value: artist.genres.slice(0, 5).join(', ') || 'None listed', inline: false },
        )
        .setFooter({ text: 'Data from Spotify' });

      if (topTracksList) {
        embed.addFields({ name: 'Top Tracks', value: topTracksList });
      }

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      await interaction.editReply({ embeds: [errorEmbed('Error', 'Failed to fetch artist data.')] });
    }
  },
};
