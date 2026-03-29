import { SlashCommandBuilder, EmbedBuilder, type ChatInputCommandInteraction } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('avatar')
    .setDescription('Show a user\'s avatar')
    .addUserOption(opt => opt.setName('user').setDescription('User to show avatar for')),
  async execute(interaction: ChatInputCommandInteraction) {
    const user = interaction.options.getUser('user') ?? interaction.user;
    const avatarUrl = user.displayAvatarURL({ size: 4096 });

    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle(`${user.tag}'s Avatar`)
      .setImage(avatarUrl)
      .setURL(avatarUrl);

    await interaction.reply({ embeds: [embed] });
  },
};
