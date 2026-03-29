import { SlashCommandBuilder, type ChatInputCommandInteraction, type GuildMember } from 'discord.js';
import { getQueue } from '../../lib/queue.js';
import { successEmbed } from '../../lib/embeds.js';

export default {
  data: new SlashCommandBuilder()
    .setName('pause')
    .setDescription('Pause or resume playback'),
  async execute(interaction: ChatInputCommandInteraction) {
    const member = interaction.member as GuildMember;
    if (!member.voice.channel) return interaction.reply({ content: 'You need to be in a voice channel.', ephemeral: true });

    const queue = getQueue(interaction.guildId!);
    if (!queue) return interaction.reply({ content: 'Nothing is playing.', ephemeral: true });

    const paused = queue.player.paused;
    await queue.player.setPaused(!paused);
    await interaction.reply({ embeds: [successEmbed(paused ? 'Resumed' : 'Paused', paused ? 'Playback resumed.' : 'Playback paused.')] });
  },
};
