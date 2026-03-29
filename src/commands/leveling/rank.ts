import { SlashCommandBuilder, AttachmentBuilder, type ChatInputCommandInteraction } from 'discord.js';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { prisma } from '../../lib/database.js';
import { xpForLevel, totalXpForLevel } from '../../lib/xp.js';
import { errorEmbed } from '../../lib/embeds.js';

export default {
  data: new SlashCommandBuilder()
    .setName('rank')
    .setDescription('Show your rank card')
    .addUserOption(opt => opt.setName('user').setDescription('User to check')),
  cooldown: 10,
  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    const user = interaction.options.getUser('user') ?? interaction.user;

    try {
      const userLevel = await prisma.userLevel.upsert({
        where: { guildId_userId: { guildId: interaction.guildId!, userId: user.id } },
        update: {},
        create: { guildId: interaction.guildId!, userId: user.id },
      });

      const level = userLevel.level;
      const xpNeeded = xpForLevel(level);
      const totalForLevel = totalXpForLevel(level);
      const currentXp = userLevel.xp - totalForLevel;

      const rank = await prisma.userLevel.count({
        where: { guildId: interaction.guildId!, xp: { gt: userLevel.xp } },
      }) + 1;

      // Generate rank card
      const canvas = createCanvas(934, 282);
      const ctx = canvas.getContext('2d');

      // Background
      ctx.fillStyle = '#23272A';
      ctx.fillRect(0, 0, 934, 282);
      ctx.fillStyle = '#2C2F33';
      ctx.fillRect(20, 20, 894, 242);

      // Avatar
      const avatarUrl = user.displayAvatarURL({ extension: 'png', size: 256 });
      const avatar = await loadImage(avatarUrl);
      ctx.save();
      ctx.beginPath();
      ctx.arc(141, 141, 100, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(avatar, 41, 41, 200, 200);
      ctx.restore();

      // Avatar border
      ctx.beginPath();
      ctx.arc(141, 141, 102, 0, Math.PI * 2);
      ctx.strokeStyle = '#5865F2';
      ctx.lineWidth = 4;
      ctx.stroke();

      // Username
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 36px sans-serif';
      ctx.fillText(user.username.slice(0, 20), 280, 80);

      ctx.fillStyle = '#99AAB5';
      ctx.font = '24px sans-serif';
      ctx.fillText(`@${user.username}`, 280, 110);

      // XP bar
      const barX = 280, barY = 140, barW = 600, barH = 40, barR = 20;

      // Bar background (rounded rect)
      ctx.fillStyle = '#484B4E';
      ctx.beginPath();
      ctx.moveTo(barX + barR, barY);
      ctx.lineTo(barX + barW - barR, barY);
      ctx.quadraticCurveTo(barX + barW, barY, barX + barW, barY + barR);
      ctx.lineTo(barX + barW, barY + barH - barR);
      ctx.quadraticCurveTo(barX + barW, barY + barH, barX + barW - barR, barY + barH);
      ctx.lineTo(barX + barR, barY + barH);
      ctx.quadraticCurveTo(barX, barY + barH, barX, barY + barH - barR);
      ctx.lineTo(barX, barY + barR);
      ctx.quadraticCurveTo(barX, barY, barX + barR, barY);
      ctx.closePath();
      ctx.fill();

      // Bar fill
      const progress = Math.min(currentXp / xpNeeded, 1);
      const fillW = Math.max(barW * progress, barR * 2);
      ctx.fillStyle = '#5865F2';
      ctx.beginPath();
      ctx.moveTo(barX + barR, barY);
      ctx.lineTo(barX + fillW - barR, barY);
      ctx.quadraticCurveTo(barX + fillW, barY, barX + fillW, barY + barR);
      ctx.lineTo(barX + fillW, barY + barH - barR);
      ctx.quadraticCurveTo(barX + fillW, barY + barH, barX + fillW - barR, barY + barH);
      ctx.lineTo(barX + barR, barY + barH);
      ctx.quadraticCurveTo(barX, barY + barH, barX, barY + barH - barR);
      ctx.lineTo(barX, barY + barR);
      ctx.quadraticCurveTo(barX, barY, barX + barR, barY);
      ctx.closePath();
      ctx.fill();

      // Level and rank text
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 28px sans-serif';
      ctx.fillText(`LEVEL ${level}`, 280, 230);
      ctx.fillText(`RANK #${rank}`, 500, 230);

      ctx.fillStyle = '#99AAB5';
      ctx.font = '22px sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(`${currentXp} / ${xpNeeded} XP`, 880, 230);

      const buffer = canvas.toBuffer('image/png');
      const attachment = new AttachmentBuilder(buffer, { name: 'rank.png' });
      await interaction.editReply({ files: [attachment] });
    } catch {
      await interaction.editReply({ embeds: [errorEmbed('Error', 'Could not generate rank card.')] });
    }
  },
};
