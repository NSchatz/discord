import { Events, type Message, EmbedBuilder } from 'discord.js';
import { logger } from '../lib/logger.js';
import { getGuildConfig } from '../lib/database.js';

export default {
  name: Events.MessageDelete,
  async execute(message: Message) {
    if (message.partial || message.author?.bot || !message.guildId) return;

    try {
      const guildConfig = await getGuildConfig(message.guildId);
      if (!guildConfig.logChannelId) return;

      const logChannel = await message.guild?.channels.fetch(guildConfig.logChannelId).catch(() => null);
      if (!logChannel?.isTextBased()) return;

      const embed = new EmbedBuilder()
        .setColor(0xED4245)
        .setTitle('Message Deleted')
        .addFields(
          { name: 'Author', value: `${message.author} (${message.author.tag})`, inline: true },
          { name: 'Channel', value: `${message.channel}`, inline: true },
          { name: 'Content', value: message.content?.slice(0, 1024) || '*No text content*' },
        )
        .setTimestamp();

      await logChannel.send({ embeds: [embed] });
    } catch (error) {
      logger.error({ error, guildId: message.guildId }, 'messageDelete log error');
    }
  },
};
