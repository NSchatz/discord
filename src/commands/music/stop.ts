import { SlashCommandBuilder, type ChatInputCommandInteraction, type GuildMember } from 'discord.js';
import { getQueue, destroyQueue } from '../../lib/queue.js';
import { successEmbed } from '../../lib/embeds.js';

export default {
  data: new SlashCommandBuilder()
    .setName('stop')
    .setDescription('Stop playback and clear the queue'),
  async execute(interaction: ChatInputCommandInteraction) {
    const member = interaction.member as GuildMember;
    if (!member.voice.channel) return interaction.reply({ content: 'You need to be in a voice channel.', ephemeral: true });

    const queue = getQueue(interaction.guildId!);
    if (!queue) return interaction.reply({ content: 'Nothing is playing.', ephemeral: true });

    destroyQueue(interaction.guildId!);
    await interaction.reply({ embeds: [successEmbed('Stopped', 'Playback stopped and queue cleared.')] });
  },
};
