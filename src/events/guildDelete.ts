import { Events, type Guild } from 'discord.js';
import { logger } from '../lib/logger.js';

export default {
  name: Events.GuildDelete,
  async execute(guild: Guild) {
    logger.info({ guildId: guild.id, name: guild.name }, 'Removed from guild');
  },
};
