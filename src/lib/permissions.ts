import { type GuildMember, type ChatInputCommandInteraction } from 'discord.js';

export function canModerate(botMember: GuildMember, target: GuildMember): boolean {
  return botMember.roles.highest.position > target.roles.highest.position;
}

export async function safeReply(
  interaction: ChatInputCommandInteraction,
  content: string,
  ephemeral = true,
) {
  try {
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({ content, ephemeral });
    } else {
      await interaction.reply({ content, ephemeral });
    }
  } catch {
    // Interaction may have expired
  }
}
