import { PrismaClient } from '@prisma/client';
import { logger } from './logger.js';

export const prisma = new PrismaClient({
  log: [
    { emit: 'event', level: 'error' },
    { emit: 'event', level: 'warn' },
  ],
});

prisma.$on('error', (e) => logger.error(e, 'Prisma error'));
prisma.$on('warn', (e) => logger.warn(e, 'Prisma warning'));

export async function getGuildConfig(guildId: string) {
  return prisma.guildConfig.upsert({
    where: { id: guildId },
    update: {},
    create: { id: guildId },
  });
}
