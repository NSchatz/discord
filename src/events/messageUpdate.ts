import { Events, type Message, EmbedBuilder } from 'discord.js';
import { logger } from '../lib/logger.js';
import { getGuildConfig } from '../lib/database.js';

export default {
  name: Events.MessageUpdate,
  async execute(oldMessage: Message, newMessage: Message) {
    if (newMessage.partial || newMessage.author?.bot || !newMessage.guildId) return;
    if (oldMessage.content === newMessage.content) return;

    try {
      const guildConfig = await getGuildConfig(newMessage.guildId);
      if (!guildConfig.logChannelId) return;

      const logChannel = await newMessage.guild?.channels.fetch(guildConfig.logChannelId).catch(() => null);
      if (!logChannel?.isTextBased()) return;

      const embed = new EmbedBuilder()
        .setColor(0xFEE75C)
        .setTitle('Message Edited')
        .addFields(
          { name: 'Author', value: `${newMessage.author} (${newMessage.author.tag})`, inline: true },
          { name: 'Channel', value: `${newMessage.channel}`, inline: true },
          { name: 'Before', value: oldMessage.content?.slice(0, 1024) || '*Unknown*' },
          { name: 'After', value: newMessage.content?.slice(0, 1024) || '*No text content*' },
        )
        .setTimestamp();

      await logChannel.send({ embeds: [embed] });
    } catch (error) {
      logger.error({ error, guildId: newMessage.guildId }, 'messageUpdate log error');
    }
  },
};
