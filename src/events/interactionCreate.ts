import { Events, type Interaction, Collection } from 'discord.js';
import { logger } from '../lib/logger.js';
import { safeReply } from '../lib/permissions.js';

export default {
  name: Events.InteractionCreate,
  async execute(interaction: Interaction) {
    if (interaction.isChatInputCommand()) {
      const command = interaction.client.commands.get(interaction.commandName);
      if (!command) return;

      // Cooldown check
      const { cooldowns } = interaction.client;
      if (!cooldowns.has(command.data.name)) {
        cooldowns.set(command.data.name, new Collection());
      }
      const now = Date.now();
      const timestamps = cooldowns.get(command.data.name)!;
      const cooldownMs = (command.cooldown ?? 3) * 1000;

      if (timestamps.has(interaction.user.id)) {
        const expiry = timestamps.get(interaction.user.id)! + cooldownMs;
        if (now < expiry) {
          const expiryUnix = Math.round(expiry / 1000);
          return safeReply(interaction, `Cooldown active. Try again <t:${expiryUnix}:R>.`);
        }
      }
      timestamps.set(interaction.user.id, now);
      setTimeout(() => timestamps.delete(interaction.user.id), cooldownMs);

      try {
        await command.execute(interaction);
      } catch (error) {
        logger.error({ error, command: interaction.commandName, guild: interaction.guildId }, 'Command error');
        await safeReply(interaction, 'Something went wrong executing this command.');
      }
    }

    if (interaction.isAutocomplete()) {
      const command = interaction.client.commands.get(interaction.commandName);
      try {
        await command?.autocomplete?.(interaction);
      } catch (error) {
        logger.error({ error, command: interaction.commandName }, 'Autocomplete error');
      }
    }

    // Button routing by customId prefix
    if (interaction.isButton()) {
      const [handler] = interaction.customId.split(':');
      try {
        if (handler === 'ticket') {
          const mod = await import('../components/buttons/ticket.js');
          await mod.default(interaction);
        } else if (handler === 'poll') {
          const mod = await import('../components/buttons/poll.js');
          await mod.default(interaction);
        }
      } catch (error) {
        logger.error({ error, customId: interaction.customId }, 'Button error');
        if (!interaction.replied && !interaction.deferred) {
          await interaction.reply({ content: 'Something went wrong.', ephemeral: true }).catch(() => {});
        }
      }
    }
  },
};
