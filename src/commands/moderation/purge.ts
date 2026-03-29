import { SlashCommandBuilder, PermissionFlagsBits, type ChatInputCommandInteraction, type TextChannel } from 'discord.js';
import { successEmbed, errorEmbed } from '../../lib/embeds.js';

export default {
  data: new SlashCommandBuilder()
    .setName('purge')
    .setDescription('Bulk delete messages')
    .addIntegerOption(opt => opt.setName('count').setDescription('Number of messages to delete (1-100)').setMinValue(1).setMaxValue(100).setRequired(true))
    .addUserOption(opt => opt.setName('user').setDescription('Only delete messages from this user'))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
  async execute(interaction: ChatInputCommandInteraction) {
    const count = interaction.options.getInteger('count', true);
    const targetUser = interaction.options.getUser('user');
    const channel = interaction.channel as TextChannel;

    if (!channel.permissionsFor(interaction.guild!.members.me!)?.has(PermissionFlagsBits.ManageMessages)) {
      return interaction.reply({ embeds: [errorEmbed('Missing Permissions', 'I need Manage Messages permission.')], ephemeral: true });
    }

    await interaction.deferReply({ ephemeral: true });

    try {
      let messages = await channel.messages.fetch({ limit: targetUser ? 100 : count });

      if (targetUser) {
        messages = messages.filter(m => m.author.id === targetUser.id);
        const sliced = [...messages.values()].slice(0, count);
        messages = new (await import('discord.js')).Collection(sliced.map(m => [m.id, m]));
      }

      // Filter out messages older than 14 days (bulk delete limit)
      const twoWeeksAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;
      const deletable = messages.filter(m => m.createdTimestamp > twoWeeksAgo);

      const deleted = await channel.bulkDelete(deletable, true);
      await interaction.editReply({ embeds: [successEmbed('Messages Purged', `Deleted **${deleted.size}** messages.`)] });
    } catch {
      await interaction.editReply({ embeds: [errorEmbed('Purge Failed', 'Could not delete messages.')] });
    }
  },
};
