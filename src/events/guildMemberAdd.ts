import { Events, type GuildMember } from 'discord.js';
import { logger } from '../lib/logger.js';
import { getGuildConfig } from '../lib/database.js';

export default {
  name: Events.GuildMemberAdd,
  async execute(member: GuildMember) {
    try {
      const guildConfig = await getGuildConfig(member.guild.id);

      // Auto-role
      if (guildConfig.autoRoleId) {
        await member.roles.add(guildConfig.autoRoleId).catch((err) =>
          logger.warn({ err, guildId: member.guild.id }, 'Failed to add auto-role')
        );
      }

      // Welcome message
      if (guildConfig.welcomeEnabled && guildConfig.welcomeChannel) {
        const channel = await member.guild.channels.fetch(guildConfig.welcomeChannel).catch(() => null);
        if (channel?.isTextBased()) {
          const message = guildConfig.welcomeMessage
            .replace(/{user}/g, `${member}`)
            .replace(/{user\.tag}/g, member.user.tag)
            .replace(/{user\.name}/g, member.user.username)
            .replace(/{server}/g, member.guild.name)
            .replace(/{memberCount}/g, member.guild.memberCount.toString());

          await channel.send({ content: message, allowedMentions: { users: [member.id] } });
        }
      }
    } catch (error) {
      logger.error({ error, guildId: member.guild.id }, 'guildMemberAdd error');
    }
  },
};
