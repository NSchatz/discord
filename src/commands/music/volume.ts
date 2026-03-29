import { SlashCommandBuilder, type ChatInputCommandInteraction, type GuildMember } from 'discord.js';
import { getQueue } from '../../lib/queue.js';
import { successEmbed } from '../../lib/embeds.js';

export default {
  data: new SlashCommandBuilder()
    .setName('volume')
    .setDescription('Set playback volume')
    .addIntegerOption(opt => opt.setName('level').setDescription('Volume (1-100)').setMinValue(1).setMaxValue(100).setRequired(true)),
  async execute(interaction: ChatInputCommandInteraction) {
    const member = interaction.member as GuildMember;
    if (!member.voice.channel) return interaction.reply({ content: 'You need to be in a voice channel.', ephemeral: true });

    const queue = getQueue(interaction.guildId!);
    if (!queue) return interaction.reply({ content: 'Nothing is playing.', ephemeral: true });

    const level = interaction.options.getInteger('level', true);
    await queue.player.setGlobalVolume(level);
    queue.volume = level;
    await interaction.reply({ embeds: [successEmbed('Volume', `Volume set to **${level}%**.`)] });
  },
};
