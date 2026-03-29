import { Client, Collection, GatewayIntentBits, Options, Partials } from 'discord.js';
import { readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createServer } from 'node:http';
import { config } from './lib/config.js';
import { logger } from './lib/logger.js';
import { prisma } from './lib/database.js';
import { redis } from './lib/redis.js';
import { initMusic } from './lib/music.js';
import type { Command } from './types/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,                 // Guild structures, channels, roles
    GatewayIntentBits.GuildMessages,          // Message events in guilds
    GatewayIntentBits.GuildMembers,           // PRIVILEGED: member join/leave, welcome/goodbye
    GatewayIntentBits.MessageContent,         // PRIVILEGED: XP tracking, AI chat, automod
    GatewayIntentBits.GuildVoiceStates,       // Voice channel tracking for music
    GatewayIntentBits.GuildMessageReactions,  // Reaction-based features
  ],
  partials: [
    Partials.Message,
    Partials.Channel,
    Partials.Reaction,
  ],
  makeCache: Options.cacheWithLimits({
    MessageManager: 100,
    GuildMemberManager: 200,
    PresenceManager: 0,
  }),
  sweepers: {
    messages: {
      interval: 3600,
      lifetime: 1800,
    },
  },
});

client.commands = new Collection<string, Command>();
client.cooldowns = new Collection();

// Load commands
const commandsPath = join(__dirname, 'commands');
for (const folder of readdirSync(commandsPath)) {
  const folderPath = join(commandsPath, folder);
  for (const file of readdirSync(folderPath).filter(f => (f.endsWith('.ts') || f.endsWith('.js')) && !f.endsWith('.d.ts') && !f.endsWith('.d.js'))) {
    const { default: command } = await import(pathToFileURL(join(folderPath, file)).href);
    if ('data' in command && 'execute' in command) {
      client.commands.set(command.data.name, command);
      logger.debug(`Loaded command: ${command.data.name}`);
    } else {
      logger.warn(`Command at ${file} is missing "data" or "execute"`);
    }
  }
}

// Load events
const eventsPath = join(__dirname, 'events');
for (const file of readdirSync(eventsPath).filter(f => (f.endsWith('.ts') || f.endsWith('.js')) && !f.endsWith('.d.ts') && !f.endsWith('.d.js'))) {
  const { default: event } = await import(pathToFileURL(join(eventsPath, file)).href);
  if (event.once) {
    client.once(event.name, (...args: unknown[]) => event.execute(...args));
  } else {
    client.on(event.name, (...args: unknown[]) => event.execute(...args));
  }
  logger.debug(`Loaded event: ${event.name}`);
}

// Initialize Lavalink for music
initMusic(client);

// Connect Redis
if (redis) {
  await redis.connect().catch((err: Error) => logger.warn(err, 'Redis connection failed, continuing without Redis'));
}

// Health check endpoint
const server = createServer((req, res) => {
  if (req.url === '/health') {
    const healthy = client.ws.status === 0;
    res.writeHead(healthy ? 200 : 503, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: healthy ? 'healthy' : 'unhealthy',
      uptime: process.uptime(),
      guilds: client.guilds.cache.size,
      ping: client.ws.ping,
      memory: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
    }));
  } else {
    res.writeHead(404);
    res.end();
  }
});
server.listen(3000, () => logger.info('Health check server on port 3000'));

// Graceful shutdown
async function shutdown() {
  logger.info('Shutting down...');
  server.close();
  client.destroy();
  if (redis) await redis.quit().catch(() => {});
  await prisma.$disconnect();
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

process.on('unhandledRejection', (error) => {
  logger.error(error, 'Unhandled promise rejection');
});

process.on('uncaughtException', (error) => {
  logger.fatal(error, 'Uncaught exception');
  process.exit(1);
});

client.login(config.DISCORD_TOKEN);
