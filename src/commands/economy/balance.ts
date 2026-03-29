import { SlashCommandBuilder, EmbedBuilder, type ChatInputCommandInteraction } from 'discord.js';
import { prisma } from '../../lib/database.js';

export default {
  data: new SlashCommandBuilder()
    .setName('balance')
    .setDescription('Check your balance')
    .addUserOption(opt => opt.setName('user').setDescription('User to check')),
  async execute(interaction: ChatInputCommandInteraction) {
    const user = interaction.options.getUser('user') ?? interaction.user;

    const economy = await prisma.userEconomy.upsert({
      where: { guildId_userId: { guildId: interaction.guildId!, userId: user.id } },
      update: {},
      create: { guildId: interaction.guildId!, userId: user.id },
    });

    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle(`${user.username}'s Balance`)
      .setThumbnail(user.displayAvatarURL())
      .addFields(
        { name: 'Wallet', value: `${economy.wallet.toLocaleString()} coins`, inline: true },
        { name: 'Bank', value: `${economy.bank.toLocaleString()} / ${economy.bankMax.toLocaleString()}`, inline: true },
        { name: 'Total', value: `${(economy.wallet + economy.bank).toLocaleString()} coins`, inline: true },
      );

    await interaction.reply({ embeds: [embed] });
  },
};
