import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, type ChatInputCommandInteraction } from 'discord.js';
import { prisma } from '../../lib/database.js';
import { errorEmbed } from '../../lib/embeds.js';

export default {
  data: new SlashCommandBuilder()
    .setName('poll')
    .setDescription('Create a poll')
    .addStringOption(opt => opt.setName('question').setDescription('Poll question').setRequired(true))
    .addStringOption(opt => opt.setName('option1').setDescription('Option 1').setRequired(true))
    .addStringOption(opt => opt.setName('option2').setDescription('Option 2').setRequired(true))
    .addStringOption(opt => opt.setName('option3').setDescription('Option 3'))
    .addStringOption(opt => opt.setName('option4').setDescription('Option 4'))
    .addStringOption(opt => opt.setName('option5').setDescription('Option 5')),
  async execute(interaction: ChatInputCommandInteraction) {
    const question = interaction.options.getString('question', true);
    const options: string[] = [];
    for (let i = 1; i <= 5; i++) {
      const opt = interaction.options.getString(`option${i}`);
      if (opt) options.push(opt);
    }

    try {
      const poll = await prisma.poll.create({
        data: {
          guildId: interaction.guildId!,
          channelId: interaction.channelId,
          question,
          options,
          creatorId: interaction.user.id,
          votes: {},
        },
      });

      const numberEmojis = ['1\u20E3', '2\u20E3', '3\u20E3', '4\u20E3', '5\u20E3'];

      const embed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle('Poll')
        .setDescription(`**${question}**\n\n${options.map((opt, i) => `${numberEmojis[i]} ${opt} - **0** votes`).join('\n')}`)
        .setFooter({ text: `Poll by ${interaction.user.tag} | ID: ${poll.id}` })
        .setTimestamp();

      const rows: ActionRowBuilder<ButtonBuilder>[] = [];
      const row = new ActionRowBuilder<ButtonBuilder>();
      for (let i = 0; i < options.length; i++) {
        row.addComponents(
          new ButtonBuilder()
            .setCustomId(`poll:vote:${poll.id}:${i}`)
            .setLabel(options[i].slice(0, 80))
            .setEmoji(numberEmojis[i])
            .setStyle(ButtonStyle.Secondary)
        );
      }
      rows.push(row);

      const reply = await interaction.reply({ embeds: [embed], components: rows, fetchReply: true });
      await prisma.poll.update({ where: { id: poll.id }, data: { messageId: reply.id } });
    } catch {
      await interaction.reply({ embeds: [errorEmbed('Error', 'Could not create poll.')], ephemeral: true });
    }
  },
};
