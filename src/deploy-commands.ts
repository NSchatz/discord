import { REST, Routes } from 'discord.js';
import { readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { config } from './lib/config.js';
import { logger } from './lib/logger.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const commands: unknown[] = [];

const commandsPath = join(__dirname, 'commands');
for (const folder of readdirSync(commandsPath)) {
  const folderPath = join(commandsPath, folder);
  for (const file of readdirSync(folderPath).filter(f => f.endsWith('.ts') || f.endsWith('.js'))) {
    const { default: command } = await import(pathToFileURL(join(folderPath, file)).href);
    if ('data' in command) {
      commands.push(command.data.toJSON());
    }
  }
}

const rest = new REST().setToken(config.DISCORD_TOKEN);

try {
  logger.info(`Deploying ${commands.length} commands...`);

  if (process.env.DEPLOY_GLOBAL === 'true') {
    const data = await rest.put(Routes.applicationCommands(config.CLIENT_ID), { body: commands }) as unknown[];
    logger.info(`Deployed ${data.length} global commands`);
  } else if (config.DEV_GUILD_ID) {
    const data = await rest.put(
      Routes.applicationGuildCommands(config.CLIENT_ID, config.DEV_GUILD_ID),
      { body: commands },
    ) as unknown[];
    logger.info(`Deployed ${data.length} guild commands to ${config.DEV_GUILD_ID}`);
  } else {
    logger.error('Set DEV_GUILD_ID for guild deploy, or DEPLOY_GLOBAL=true for global deploy');
    process.exit(1);
  }
} catch (error) {
  logger.error(error, 'Failed to deploy commands');
  process.exit(1);
}
