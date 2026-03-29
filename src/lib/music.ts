import { Shoukaku, Connectors } from 'shoukaku';
import type { Client } from 'discord.js';
import { config } from './config.js';
import { logger } from './logger.js';

let shoukaku: Shoukaku | null = null;

export function initMusic(client: Client) {
  const nodes = [{
    name: 'main',
    url: `${config.LAVALINK_HOST}:${config.LAVALINK_PORT}`,
    auth: config.LAVALINK_PASSWORD,
  }];

  shoukaku = new Shoukaku(new Connectors.DiscordJS(client), nodes, {
    moveOnDisconnect: false,
    resume: true,
    resumeTimeout: 30,
    reconnectTries: 3,
    restTimeout: 60_000,
  });

  shoukaku.on('ready', (name) => logger.info(`Lavalink node ${name} connected`));
  shoukaku.on('error', (name, error) => logger.error({ name, error }, 'Lavalink error'));
  shoukaku.on('close', (name, code, reason) => logger.warn({ name, code, reason }, 'Lavalink closed'));

  return shoukaku;
}

export function getShoukaku(): Shoukaku | null {
  return shoukaku;
}
