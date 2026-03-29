import { SlashCommandBuilder, type ChatInputCommandInteraction, type GuildMember } from 'discord.js';
import type { Track } from 'shoukaku';
import { getShoukaku } from '../../lib/music.js';
import { getQueue, createQueue, destroyQueue } from '../../lib/queue.js';
import { errorEmbed } from '../../lib/embeds.js';

export default {
  data: new SlashCommandBuilder()
    .setName('play')
    .setDescription('Play a song')
    .addStringOption(opt => opt.setName('query').setDescription('Song URL or search query').setRequired(true)),
  async execute(interaction: ChatInputCommandInteraction) {
    const member = interaction.member as GuildMember;
    const voiceChannel = member.voice.channel;
    if (!voiceChannel) {
      return interaction.reply({ content: 'You need to be in a voice channel.', ephemeral: true });
    }

    const shoukaku = getShoukaku();
    if (!shoukaku || !shoukaku.nodes.size) {
      return interaction.reply({ embeds: [errorEmbed('Music Unavailable', 'Lavalink is not connected.')], ephemeral: true });
    }

    await interaction.deferReply();

    const query = interaction.options.getString('query', true);
    const guildId = interaction.guildId!;

    let queue = getQueue(guildId);
    if (!queue) {
      const player = await shoukaku.joinVoiceChannel({
        guildId,
        channelId: voiceChannel.id,
        shardId: 0,
      });

      queue = createQueue(guildId, player, interaction.channelId);

      // Handle track end
      player.on('end', async () => {
        const q = getQueue(guildId);
        if (!q) return;

        if (q.loop === 'track' && q.current) {
          await q.player.playTrack({ track: { encoded: q.current.encoded } });
          return;
        }
        if (q.loop === 'queue' && q.current) {
          q.tracks.push(q.current);
        }
        if (q.tracks.length > 0) {
          q.current = q.tracks.shift()!;
          await q.player.playTrack({ track: { encoded: q.current.encoded } });
        } else {
          q.current = null;
          setTimeout(() => {
            const currentQ = getQueue(guildId);
            if (currentQ && !currentQ.current) destroyQueue(guildId, shoukaku);
          }, 300_000);
        }
      });
    }

    const searchQuery = query.startsWith('http') ? query : `scsearch:${query}`;
    const node = [...shoukaku.nodes.values()][0];
    const result = await node.rest.resolve(searchQuery);

    if (!result?.data || (Array.isArray(result.data) && result.data.length === 0)) {
      return interaction.editReply({ embeds: [errorEmbed('No Results', 'Could not find any tracks.')] });
    }

    let track: Track;
    if ('tracks' in result.data && Array.isArray((result.data as { tracks: Track[] }).tracks)) {
      // Playlist result
      const playlist = result.data as { tracks: Track[] };
      track = playlist.tracks[0];
    } else if (Array.isArray(result.data)) {
      // Search result
      track = result.data[0];
    } else if ('encoded' in result.data) {
      // Single track result
      track = result.data as Track;
    } else {
      return interaction.editReply({ embeds: [errorEmbed('No Results', 'Could not find any tracks.')] });
    }

    queue.tracks.push(track);

    if (!queue.current) {
      queue.current = queue.tracks.shift()!;
      await queue.player.playTrack({ track: { encoded: queue.current.encoded } });
      await interaction.editReply(`Now playing: **${queue.current.info.title}**`);
    } else {
      await interaction.editReply(`Added to queue: **${track.info.title}**`);
    }
  },
};
