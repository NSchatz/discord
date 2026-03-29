import { SlashCommandBuilder, type ChatInputCommandInteraction, type GuildMember } from 'discord.js';
import { getQueue } from '../../lib/queue.js';
import { successEmbed } from '../../lib/embeds.js';

export default {
  data: new SlashCommandBuilder()
    .setName('loop')
    .setDescription('Set loop mode')
    .addStringOption(opt => opt.setName('mode').setDescription('Loop mode').setRequired(true)
      .addChoices({ name: 'Off', value: 'off' }, { name: 'Track', value: 'track' }, { name: 'Queue', value: 'queue' })),
  async execute(interaction: ChatInputCommandInteraction) {
    const member = interaction.member as GuildMember;
    if (!member.voice.channel) return interaction.reply({ content: 'You need to be in a voice channel.', ephemeral: true });

    const queue = getQueue(interaction.guildId!);
    if (!queue) return interaction.reply({ content: 'Nothing is playing.', ephemeral: true });

    const mode = interaction.options.getString('mode', true) as 'off' | 'track' | 'queue';
    queue.loop = mode;
    await interaction.reply({ embeds: [successEmbed('Loop Mode', `Loop set to **${mode}**.`)] });
  },
};
