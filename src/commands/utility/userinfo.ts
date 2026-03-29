import { SlashCommandBuilder, EmbedBuilder, type ChatInputCommandInteraction } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('userinfo')
    .setDescription('Show user information')
    .addUserOption(opt => opt.setName('user').setDescription('User to look up')),
  async execute(interaction: ChatInputCommandInteraction) {
    const user = interaction.options.getUser('user') ?? interaction.user;
    const member = await interaction.guild!.members.fetch(user.id).catch(() => null);
    const created = Math.floor(user.createdTimestamp / 1000);

    const embed = new EmbedBuilder()
      .setColor(member?.displayHexColor ?? 0x5865F2)
      .setTitle(user.tag)
      .setThumbnail(user.displayAvatarURL({ size: 512 }))
      .addFields(
        { name: 'ID', value: user.id, inline: true },
        { name: 'Display Name', value: member?.displayName ?? user.username, inline: true },
        { name: 'Account Created', value: `<t:${created}:R>`, inline: true },
      );

    if (member) {
      const joined = Math.floor(member.joinedTimestamp! / 1000);
      const roles = member.roles.cache
        .filter(r => r.id !== interaction.guildId)
        .sort((a, b) => b.position - a.position)
        .map(r => `${r}`)
        .slice(0, 20);

      embed.addFields(
        { name: 'Joined Server', value: `<t:${joined}:R>`, inline: true },
        { name: `Roles (${member.roles.cache.size - 1})`, value: roles.length > 0 ? roles.join(', ') : 'None' },
      );
    }

    await interaction.reply({ embeds: [embed] });
  },
};
