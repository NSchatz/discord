import Redis from 'ioredis';
import { config } from './config.js';
import { logger } from './logger.js';

export const redis = config.REDIS_URL
  ? new Redis.default(config.REDIS_URL, {
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    })
  : null;

redis?.on('error', (err: Error) => logger.error(err, 'Redis error'));
redis?.on('connect', () => logger.info('Redis connected'));

export async function checkCooldown(key: string, cooldownSeconds: number): Promise<number> {
  if (!redis) return 0;
  const existing = await redis.get(key);
  if (existing) {
    const ttl = await redis.ttl(key);
    return ttl > 0 ? ttl : 0;
  }
  await redis.set(key, '1', 'EX', cooldownSeconds);
  return 0;
}
