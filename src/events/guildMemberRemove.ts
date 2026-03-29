import { Events, type GuildMember } from 'discord.js';
import { logger } from '../lib/logger.js';
import { getGuildConfig } from '../lib/database.js';

export default {
  name: Events.GuildMemberRemove,
  async execute(member: GuildMember) {
    try {
      const guildConfig = await getGuildConfig(member.guild.id);

      if (guildConfig.goodbyeEnabled && guildConfig.goodbyeChannel) {
        const channel = await member.guild.channels.fetch(guildConfig.goodbyeChannel).catch(() => null);
        if (channel?.isTextBased()) {
          const message = guildConfig.goodbyeMessage
            .replace(/{user}/g, `${member}`)
            .replace(/{user\.tag}/g, member.user.tag)
            .replace(/{user\.name}/g, member.user.username)
            .replace(/{server}/g, member.guild.name)
            .replace(/{memberCount}/g, member.guild.memberCount.toString());

          await channel.send({ content: message, allowedMentions: { parse: [] } });
        }
      }
    } catch (error) {
      logger.error({ error, guildId: member.guild.id }, 'guildMemberRemove error');
    }
  },
};
