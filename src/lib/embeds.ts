import { EmbedBuilder, type ColorResolvable } from 'discord.js';

const COLORS = {
  primary: 0x5865F2 as ColorResolvable,
  success: 0x57F287 as ColorResolvable,
  warning: 0xFEE75C as ColorResolvable,
  error: 0xED4245 as ColorResolvable,
  info: 0x5865F2 as ColorResolvable,
};

export function successEmbed(title: string, description?: string) {
  return new EmbedBuilder().setColor(COLORS.success).setTitle(title).setDescription(description ?? null);
}

export function errorEmbed(title: string, description?: string) {
  return new EmbedBuilder().setColor(COLORS.error).setTitle(title).setDescription(description ?? null);
}

export function infoEmbed(title: string, description?: string) {
  return new EmbedBuilder().setColor(COLORS.info).setTitle(title).setDescription(description ?? null);
}

export function warningEmbed(title: string, description?: string) {
  return new EmbedBuilder().setColor(COLORS.warning).setTitle(title).setDescription(description ?? null);
}
