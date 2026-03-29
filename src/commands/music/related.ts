import { SlashCommandBuilder, EmbedBuilder, type ChatInputCommandInteraction } from 'discord.js';
import { searchArtist, getRelatedArtists, formatNumber, isSpotifyConfigured } from '../../lib/spotify.js';
import { errorEmbed } from '../../lib/embeds.js';

export default {
  data: new SlashCommandBuilder()
    .setName('related')
    .setDescription('Find artists similar to a given artist')
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

      const related = await getRelatedArtists(artist.id);
      if (!related.length) {
        return interaction.editReply({ embeds: [errorEmbed('No Results', `No related artists found for ${artist.name}.`)] });
      }

      const list = related
        .slice(0, 10)
        .map((a, i) => {
          const genres = a.genres.slice(0, 3).join(', ') || 'No genres';
          return `**${i + 1}.** [${a.name}](${a.external_urls.spotify}) \u2014 ${formatNumber(a.followers.total)} followers\n\u2003\u2003${genres}`;
        })
        .join('\n');

      const embed = new EmbedBuilder()
        .setColor(0x1DB954)
        .setTitle(`Artists Similar to ${artist.name}`)
        .setURL(artist.external_urls.spotify)
        .setThumbnail(artist.images[0]?.url ?? null)
        .setDescription(list)
        .setFooter({ text: 'Data from Spotify' });

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      await interaction.editReply({ embeds: [errorEmbed('Error', 'Failed to fetch related artists.')] });
    }
  },
};
