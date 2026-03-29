import { SlashCommandBuilder, EmbedBuilder, type ChatInputCommandInteraction } from 'discord.js';
import { searchArtist, getArtistTopTracks, formatDuration, formatNumber, isSpotifyConfigured } from '../../lib/spotify.js';
import { errorEmbed } from '../../lib/embeds.js';

export default {
  data: new SlashCommandBuilder()
    .setName('top-tracks')
    .setDescription("Get an artist's top 10 tracks on Spotify")
    .addStringOption(opt => opt.setName('artist').setDescription('Artist name').setRequired(true)),
  cooldown: 5,
  async execute(interaction: ChatInputCommandInteraction) {
    if (!isSpotifyConfigured()) {
      return interaction.reply({ embeds: [errorEmbed('Not Configured', 'Spotify API credentials are not set up.')], ephemeral: true });
    }

    await interaction.deferReply();
    const query = interaction.options.getString('artist', true);

    try {
      const artist = await searchArtist(query);
      if (!artist) {
        return interaction.editReply({ embeds: [errorEmbed('Not Found', `No artist found for "${query}".`)] });
      }

      const tracks = await getArtistTopTracks(artist.id);
      if (!tracks.length) {
        return interaction.editReply({ embeds: [errorEmbed('No Tracks', `No top tracks found for ${artist.name}.`)] });
      }

      const trackList = tracks
        .slice(0, 10)
        .map((t, i) => {
          const popularity = '\u2588'.repeat(Math.round(t.popularity / 10)) + '\u2591'.repeat(10 - Math.round(t.popularity / 10));
          return `**${i + 1}.** [${t.name}](${t.external_urls.spotify})\n\u2003\u2003${t.album.name} \u2022 ${formatDuration(t.duration_ms)} \u2022 ${popularity} ${t.popularity}%`;
        })
        .join('\n');

      const embed = new EmbedBuilder()
        .setColor(0x1DB954)
        .setTitle(`Top Tracks \u2014 ${artist.name}`)
        .setURL(artist.external_urls.spotify)
        .setThumbnail(artist.images[0]?.url ?? null)
        .setDescription(trackList)
        .setFooter({ text: `${formatNumber(artist.followers.total)} followers \u2022 Data from Spotify` });

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      await interaction.editReply({ embeds: [errorEmbed('Error', 'Failed to fetch top tracks.')] });
    }
  },
};
