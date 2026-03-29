import { SlashCommandBuilder, PermissionFlagsBits, ChannelType, type ChatInputCommandInteraction, type TextChannel } from 'discord.js';
import { successEmbed, errorEmbed } from '../../lib/embeds.js';

export default {
  data: new SlashCommandBuilder()
    .setName('lockdown')
    .setDescription('Lock or unlock a channel')
    .addStringOption(opt => opt.setName('action').setDescription('Lock or unlock').setRequired(true)
      .addChoices({ name: 'Lock', value: 'lock' }, { name: 'Unlock', value: 'unlock' }))
    .addChannelOption(opt => opt.setName('channel').setDescription('Target channel').addChannelTypes(ChannelType.GuildText))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),
  async execute(interaction: ChatInputCommandInteraction) {
    const action = interaction.options.getString('action', true);
    const channel = (interaction.options.getChannel('channel') ?? interaction.channel) as TextChannel;
    const everyoneRole = interaction.guild!.roles.everyone;

    try {
      if (action === 'lock') {
        await channel.permissionOverwrites.edit(everyoneRole, { SendMessages: false });
        await interaction.reply({ embeds: [successEmbed('Channel Locked', `${channel} has been locked.`)] });
      } else {
        await channel.permissionOverwrites.edit(everyoneRole, { SendMessages: null });
        await interaction.reply({ embeds: [successEmbed('Channel Unlocked', `${channel} has been unlocked.`)] });
      }
    } catch {
      await interaction.reply({ embeds: [errorEmbed('Failed', 'Could not modify channel permissions.')], ephemeral: true });
    }
  },
};
