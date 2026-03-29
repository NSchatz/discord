import { Events, ActivityType, type Client } from 'discord.js';
import { logger } from '../lib/logger.js';
import { prisma } from '../lib/database.js';

export default {
  name: Events.ClientReady,
  once: true,
  async execute(client: Client<true>) {
    logger.info(`Ready! Logged in as ${client.user.tag}`);
    logger.info(`Serving ${client.guilds.cache.size} guilds`);

    client.user.setActivity({
      name: `${client.guilds.cache.size} servers`,
      type: ActivityType.Watching,
    });

    // Load pending reminders
    const reminders = await prisma.reminder.findMany({
      where: { remindAt: { gt: new Date() } },
    });

    for (const reminder of reminders) {
      const delay = reminder.remindAt.getTime() - Date.now();
      if (delay > 0 && delay < 2_147_483_647) {
        setTimeout(async () => {
          try {
            const user = await client.users.fetch(reminder.userId);
            await user.send(`Reminder: ${reminder.message}`).catch(() => {});
            await prisma.reminder.delete({ where: { id: reminder.id } });
          } catch {
            // User not found or DMs disabled
          }
        }, delay);
      }
    }
  },
};
