import { SlashCommandBuilder, PermissionFlagsBits, ChannelType, type ChatInputCommandInteraction, type TextChannel } from 'discord.js';
import { successEmbed, errorEmbed } from '../../lib/embeds.js';

export default {
  data: new SlashCommandBuilder()
    .setName('slowmode')
    .setDescription('Set channel slowmode')
    .addIntegerOption(opt => opt.setName('seconds').setDescription('Slowmode in seconds (0 = off, max 21600)').setMinValue(0).setMaxValue(21600).setRequired(true))
    .addChannelOption(opt => opt.setName('channel').setDescription('Target channel').addChannelTypes(ChannelType.GuildText))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),
  async execute(interaction: ChatInputCommandInteraction) {
    const seconds = interaction.options.getInteger('seconds', true);
    const channel = (interaction.options.getChannel('channel') ?? interaction.channel) as TextChannel;

    try {
      await channel.setRateLimitPerUser(seconds);
      const msg = seconds === 0 ? `Slowmode disabled in ${channel}.` : `Slowmode set to **${seconds}s** in ${channel}.`;
      await interaction.reply({ embeds: [successEmbed('Slowmode Updated', msg)] });
    } catch {
      await interaction.reply({ embeds: [errorEmbed('Failed', 'Could not update slowmode.')], ephemeral: true });
    }
  },
};
