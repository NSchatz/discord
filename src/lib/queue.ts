import type { Player, Track, Shoukaku } from 'shoukaku';

export interface GuildQueue {
  player: Player;
  tracks: Track[];
  current: Track | null;
  loop: 'off' | 'track' | 'queue';
  volume: number;
  textChannelId: string;
}

export const queues = new Map<string, GuildQueue>();

export function getQueue(guildId: string): GuildQueue | undefined {
  return queues.get(guildId);
}

export function createQueue(guildId: string, player: Player, textChannelId: string): GuildQueue {
  const queue: GuildQueue = {
    player,
    tracks: [],
    current: null,
    loop: 'off',
    volume: 100,
    textChannelId,
  };
  queues.set(guildId, queue);
  return queue;
}

export function destroyQueue(guildId: string, shoukaku?: Shoukaku) {
  const queue = queues.get(guildId);
  if (queue) {
    if (shoukaku) {
      shoukaku.leaveVoiceChannel(guildId).catch(() => {});
    } else {
      queue.player.destroy().catch(() => {});
    }
    queues.delete(guildId);
  }
}
