import { SlashCommandBuilder, PermissionFlagsBits, ChannelType, type ChatInputCommandInteraction } from 'discord.js';
import { prisma } from '../../lib/database.js';
import { successEmbed, errorEmbed } from '../../lib/embeds.js';

export default {
  data: new SlashCommandBuilder()
    .setName('config')
    .setDescription('Server configuration')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommandGroup(group => group.setName('welcome').setDescription('Welcome settings')
      .addSubcommand(sub => sub.setName('channel').setDescription('Set welcome channel')
        .addChannelOption(opt => opt.setName('channel').setDescription('Channel').addChannelTypes(ChannelType.GuildText).setRequired(true)))
      .addSubcommand(sub => sub.setName('message').setDescription('Set welcome message')
        .addStringOption(opt => opt.setName('template').setDescription('Message template ({user}, {server}, {memberCount})').setRequired(true)))
      .addSubcommand(sub => sub.setName('toggle').setDescription('Enable/disable welcome messages'))
      .addSubcommand(sub => sub.setName('autorole').setDescription('Set auto-role on join')
        .addRoleOption(opt => opt.setName('role').setDescription('Role to assign').setRequired(true))))
    .addSubcommandGroup(group => group.setName('goodbye').setDescription('Goodbye settings')
      .addSubcommand(sub => sub.setName('channel').setDescription('Set goodbye channel')
        .addChannelOption(opt => opt.setName('channel').setDescription('Channel').addChannelTypes(ChannelType.GuildText).setRequired(true)))
      .addSubcommand(sub => sub.setName('message').setDescription('Set goodbye message')
        .addStringOption(opt => opt.setName('template').setDescription('Message template').setRequired(true)))
      .addSubcommand(sub => sub.setName('toggle').setDescription('Enable/disable goodbye messages')))
    .addSubcommandGroup(group => group.setName('logs').setDescription('Logging settings')
      .addSubcommand(sub => sub.setName('channel').setDescription('Set log channel')
        .addChannelOption(opt => opt.setName('channel').setDescription('Channel').addChannelTypes(ChannelType.GuildText).setRequired(true)))
      .addSubcommand(sub => sub.setName('disable').setDescription('Disable logging')))
    .addSubcommandGroup(group => group.setName('module').setDescription('Module toggles')
      .addSubcommand(sub => sub.setName('toggle').setDescription('Toggle a module')
        .addStringOption(opt => opt.setName('name').setDescription('Module name').setRequired(true)
          .addChoices(
            { name: 'Economy', value: 'economy' }, { name: 'Leveling', value: 'leveling' },
            { name: 'Tickets', value: 'tickets' }, { name: 'Music', value: 'music' }, { name: 'AI', value: 'ai' },
          ))
        .addBooleanOption(opt => opt.setName('enabled').setDescription('Enable or disable').setRequired(true))))
    .addSubcommandGroup(group => group.setName('leveling').setDescription('Leveling settings')
      .addSubcommand(sub => sub.setName('cooldown').setDescription('Set XP cooldown')
        .addIntegerOption(opt => opt.setName('seconds').setDescription('Cooldown in seconds').setMinValue(10).setMaxValue(300).setRequired(true)))
      .addSubcommand(sub => sub.setName('channel').setDescription('Set level-up announcement channel')
        .addChannelOption(opt => opt.setName('channel').setDescription('Channel').addChannelTypes(ChannelType.GuildText).setRequired(true))))
    .addSubcommandGroup(group => group.setName('rewards').setDescription('Level reward settings')
      .addSubcommand(sub => sub.setName('add').setDescription('Add a level reward')
        .addIntegerOption(opt => opt.setName('level').setDescription('Level').setMinValue(1).setRequired(true))
        .addRoleOption(opt => opt.setName('role').setDescription('Role to grant').setRequired(true)))
      .addSubcommand(sub => sub.setName('remove').setDescription('Remove a level reward')
        .addIntegerOption(opt => opt.setName('level').setDescription('Level').setMinValue(1).setRequired(true))))
    .addSubcommandGroup(group => group.setName('ai').setDescription('AI settings')
      .addSubcommand(sub => sub.setName('channel').setDescription('Set AI listening channel')
        .addChannelOption(opt => opt.setName('channel').setDescription('Channel').addChannelTypes(ChannelType.GuildText).setRequired(true)))
      .addSubcommand(sub => sub.setName('persona').setDescription('Set AI persona')
        .addStringOption(opt => opt.setName('text').setDescription('System prompt for the AI').setRequired(true))))
    .addSubcommandGroup(group => group.setName('warnings').setDescription('Warning escalation')
      .addSubcommand(sub => sub.setName('timeout-threshold').setDescription('Warns before auto-timeout')
        .addIntegerOption(opt => opt.setName('count').setDescription('Number of warnings').setMinValue(1).setRequired(true)))
      .addSubcommand(sub => sub.setName('ban-threshold').setDescription('Warns before auto-ban')
        .addIntegerOption(opt => opt.setName('count').setDescription('Number of warnings').setMinValue(2).setRequired(true)))),
  async execute(interaction: ChatInputCommandInteraction) {
    const group = interaction.options.getSubcommandGroup(true);
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guildId!;

    try {
      await prisma.guildConfig.upsert({ where: { id: guildId }, update: {}, create: { id: guildId } });

      if (group === 'welcome') {
        if (sub === 'channel') {
          const ch = interaction.options.getChannel('channel', true);
          await prisma.guildConfig.update({ where: { id: guildId }, data: { welcomeChannel: ch.id } });
          return interaction.reply({ embeds: [successEmbed('Welcome Channel', `Set to ${ch}.`)] });
        }
        if (sub === 'message') {
          const template = interaction.options.getString('template', true);
          await prisma.guildConfig.update({ where: { id: guildId }, data: { welcomeMessage: template } });
          return interaction.reply({ embeds: [successEmbed('Welcome Message', `Updated to: ${template}`)] });
        }
        if (sub === 'toggle') {
          const current = await prisma.guildConfig.findUnique({ where: { id: guildId } });
          const newVal = !current?.welcomeEnabled;
          await prisma.guildConfig.update({ where: { id: guildId }, data: { welcomeEnabled: newVal } });
          return interaction.reply({ embeds: [successEmbed('Welcome Messages', newVal ? 'Enabled' : 'Disabled')] });
        }
        if (sub === 'autorole') {
          const role = interaction.options.getRole('role', true);
          await prisma.guildConfig.update({ where: { id: guildId }, data: { autoRoleId: role.id } });
          return interaction.reply({ embeds: [successEmbed('Auto-Role', `Set to ${role}.`)] });
        }
      }

      if (group === 'goodbye') {
        if (sub === 'channel') {
          const ch = interaction.options.getChannel('channel', true);
          await prisma.guildConfig.update({ where: { id: guildId }, data: { goodbyeChannel: ch.id } });
          return interaction.reply({ embeds: [successEmbed('Goodbye Channel', `Set to ${ch}.`)] });
        }
        if (sub === 'message') {
          const template = interaction.options.getString('template', true);
          await prisma.guildConfig.update({ where: { id: guildId }, data: { goodbyeMessage: template } });
          return interaction.reply({ embeds: [successEmbed('Goodbye Message', `Updated to: ${template}`)] });
        }
        if (sub === 'toggle') {
          const current = await prisma.guildConfig.findUnique({ where: { id: guildId } });
          const newVal = !current?.goodbyeEnabled;
          await prisma.guildConfig.update({ where: { id: guildId }, data: { goodbyeEnabled: newVal } });
          return interaction.reply({ embeds: [successEmbed('Goodbye Messages', newVal ? 'Enabled' : 'Disabled')] });
        }
      }

      if (group === 'logs') {
        if (sub === 'channel') {
          const ch = interaction.options.getChannel('channel', true);
          await prisma.guildConfig.update({ where: { id: guildId }, data: { logChannelId: ch.id } });
          return interaction.reply({ embeds: [successEmbed('Log Channel', `Set to ${ch}.`)] });
        }
        if (sub === 'disable') {
          await prisma.guildConfig.update({ where: { id: guildId }, data: { logChannelId: null } });
          return interaction.reply({ embeds: [successEmbed('Logging', 'Disabled.')] });
        }
      }

      if (group === 'module') {
        const name = interaction.options.getString('name', true);
        const enabled = interaction.options.getBoolean('enabled', true);
        const fieldMap: Record<string, string> = {
          economy: 'enableEconomy', leveling: 'enableLeveling', tickets: 'enableTickets',
          music: 'enableMusic', ai: 'enableAi',
        };
        await prisma.guildConfig.update({ where: { id: guildId }, data: { [fieldMap[name]]: enabled } });
        return interaction.reply({ embeds: [successEmbed('Module Updated', `**${name}** is now ${enabled ? 'enabled' : 'disabled'}.`)] });
      }

      if (group === 'leveling') {
        if (sub === 'cooldown') {
          const seconds = interaction.options.getInteger('seconds', true);
          await prisma.guildConfig.update({ where: { id: guildId }, data: { xpCooldown: seconds } });
          return interaction.reply({ embeds: [successEmbed('XP Cooldown', `Set to **${seconds}** seconds.`)] });
        }
        if (sub === 'channel') {
          const ch = interaction.options.getChannel('channel', true);
          await prisma.guildConfig.update({ where: { id: guildId }, data: { levelUpChannel: ch.id } });
          return interaction.reply({ embeds: [successEmbed('Level-Up Channel', `Set to ${ch}.`)] });
        }
      }

      if (group === 'rewards') {
        if (sub === 'add') {
          const level = interaction.options.getInteger('level', true);
          const role = interaction.options.getRole('role', true);
          await prisma.levelReward.upsert({
            where: { guildId_level: { guildId, level } },
            update: { roleId: role.id },
            create: { guildId, level, roleId: role.id },
          });
          return interaction.reply({ embeds: [successEmbed('Reward Added', `Level **${level}** grants ${role}.`)] });
        }
        if (sub === 'remove') {
          const level = interaction.options.getInteger('level', true);
          await prisma.levelReward.deleteMany({ where: { guildId, level } });
          return interaction.reply({ embeds: [successEmbed('Reward Removed', `Removed reward for level **${level}**.`)] });
        }
      }

      if (group === 'ai') {
        if (sub === 'channel') {
          const ch = interaction.options.getChannel('channel', true);
          await prisma.guildConfig.update({ where: { id: guildId }, data: { aiChannelId: ch.id } });
          return interaction.reply({ embeds: [successEmbed('AI Channel', `Set to ${ch}.`)] });
        }
        if (sub === 'persona') {
          const text = interaction.options.getString('text', true);
          await prisma.guildConfig.update({ where: { id: guildId }, data: { aiPersona: text } });
          return interaction.reply({ embeds: [successEmbed('AI Persona', 'Updated.')] });
        }
      }

      if (group === 'warnings') {
        if (sub === 'timeout-threshold') {
          const count = interaction.options.getInteger('count', true);
          await prisma.guildConfig.update({ where: { id: guildId }, data: { warnThresholdTimeout: count } });
          return interaction.reply({ embeds: [successEmbed('Timeout Threshold', `Auto-timeout after **${count}** warnings.`)] });
        }
        if (sub === 'ban-threshold') {
          const count = interaction.options.getInteger('count', true);
          await prisma.guildConfig.update({ where: { id: guildId }, data: { warnThresholdBan: count } });
          return interaction.reply({ embeds: [successEmbed('Ban Threshold', `Auto-ban after **${count}** warnings.`)] });
        }
      }
    } catch {
      await interaction.reply({ embeds: [errorEmbed('Error', 'Could not update configuration.')], ephemeral: true });
    }
  },
};
