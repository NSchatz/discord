import { SlashCommandBuilder, type ChatInputCommandInteraction, type GuildMember } from 'discord.js';
import { getQueue } from '../../lib/queue.js';
import { successEmbed } from '../../lib/embeds.js';

export default {
  data: new SlashCommandBuilder()
    .setName('skip')
    .setDescription('Skip the current song'),
  async execute(interaction: ChatInputCommandInteraction) {
    const member = interaction.member as GuildMember;
    if (!member.voice.channel) return interaction.reply({ content: 'You need to be in a voice channel.', ephemeral: true });

    const queue = getQueue(interaction.guildId!);
    if (!queue || !queue.current) return interaction.reply({ content: 'Nothing is playing.', ephemeral: true });

    const skipped = queue.current.info.title;
    await queue.player.stopTrack();
    await interaction.reply({ embeds: [successEmbed('Skipped', `Skipped **${skipped}**.`)] });
  },
};
