import { Events, type Guild } from 'discord.js';
import { logger } from '../lib/logger.js';
import { getGuildConfig } from '../lib/database.js';

export default {
  name: Events.GuildCreate,
  async execute(guild: Guild) {
    logger.info({ guildId: guild.id, name: guild.name }, 'Joined new guild');
    await getGuildConfig(guild.id);
  },
};
