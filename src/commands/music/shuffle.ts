import { SlashCommandBuilder, type ChatInputCommandInteraction, type GuildMember } from 'discord.js';
import { getQueue } from '../../lib/queue.js';
import { successEmbed } from '../../lib/embeds.js';

export default {
  data: new SlashCommandBuilder()
    .setName('shuffle')
    .setDescription('Shuffle the queue'),
  async execute(interaction: ChatInputCommandInteraction) {
    const member = interaction.member as GuildMember;
    if (!member.voice.channel) return interaction.reply({ content: 'You need to be in a voice channel.', ephemeral: true });

    const queue = getQueue(interaction.guildId!);
    if (!queue || queue.tracks.length < 2) return interaction.reply({ content: 'Not enough tracks to shuffle.', ephemeral: true });

    // Fisher-Yates shuffle
    for (let i = queue.tracks.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [queue.tracks[i], queue.tracks[j]] = [queue.tracks[j], queue.tracks[i]];
    }

    await interaction.reply({ embeds: [successEmbed('Shuffled', `Shuffled **${queue.tracks.length}** tracks.`)] });
  },
};
