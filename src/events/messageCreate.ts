import { Events, type Message } from 'discord.js';
import { logger } from '../lib/logger.js';
import { prisma, getGuildConfig } from '../lib/database.js';
import { redis } from '../lib/redis.js';
import { randomXp, xpForLevel } from '../lib/xp.js';

export default {
  name: Events.MessageCreate,
  async execute(message: Message) {
    if (message.author.bot || !message.guildId) return;

    try {
      const guildConfig = await getGuildConfig(message.guildId);

      if (guildConfig.enableLeveling && !guildConfig.ignoredXpChannels.includes(message.channelId)) {
        await handleXp(message, guildConfig);
      }
    } catch (error) {
      logger.error({ error, guildId: message.guildId }, 'messageCreate error');
    }
  },
};

async function handleXp(
  message: Message,
  guildConfig: { xpMin: number; xpMax: number; xpCooldown: number; levelUpChannel: string | null },
) {
  const cooldownKey = `xp:${message.guildId}:${message.author.id}`;

  if (redis) {
    const onCooldown = await redis.get(cooldownKey);
    if (onCooldown) return;
    await redis.set(cooldownKey, '1', 'EX', guildConfig.xpCooldown);
  }

  const xpGain = randomXp(guildConfig.xpMin, guildConfig.xpMax);

  const userLevel = await prisma.userLevel.upsert({
    where: { guildId_userId: { guildId: message.guildId!, userId: message.author.id } },
    update: {
      xp: { increment: xpGain },
      messages: { increment: 1 },
      lastXpAt: new Date(),
    },
    create: {
      guildId: message.guildId!,
      userId: message.author.id,
      xp: xpGain,
      messages: 1,
      lastXpAt: new Date(),
    },
  });

  const newLevel = calculateLevel(userLevel.xp);
  if (newLevel > userLevel.level) {
    await prisma.userLevel.update({
      where: { guildId_userId: { guildId: message.guildId!, userId: message.author.id } },
      data: { level: newLevel },
    });

    const targetChannel = guildConfig.levelUpChannel
      ? await message.guild?.channels.fetch(guildConfig.levelUpChannel).catch(() => null)
      : message.channel;

    if (targetChannel?.isTextBased() && 'send' in targetChannel) {
      await targetChannel.send({
        content: `Congratulations ${message.author}! You reached **Level ${newLevel}**!`,
        allowedMentions: { users: [message.author.id] },
      }).catch(() => {});
    }

    // Award level rewards
    const rewards = await prisma.levelReward.findMany({
      where: { guildId: message.guildId!, level: { lte: newLevel } },
    });
    if (message.member) {
      for (const reward of rewards) {
        if (!message.member.roles.cache.has(reward.roleId)) {
          await message.member.roles.add(reward.roleId).catch(() => {});
        }
      }
    }
  }
}

function calculateLevel(totalXp: number): number {
  let level = 0;
  let remaining = totalXp;
  while (remaining >= xpForLevel(level)) {
    remaining -= xpForLevel(level);
    level++;
  }
  return level;
}
