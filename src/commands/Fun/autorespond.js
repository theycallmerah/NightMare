export const data = new SlashCommandBuilder()...
export async function execute(interaction) {
export default {
  data: new SlashCommandBuilder()
    .setName('autorespond')
    .setDescription('Manage auto responses')
    .addSubcommand(sub => sub
      .setName('add')
      .setDescription('Add an auto response')
      .addStringOption(opt => opt.setName('trigger').setDescription('The trigger message').setRequired(true))
      .addStringOption(opt => opt.setName('response').setDescription('The response').setRequired(true))
    )
    .addSubcommand(sub => sub
      .setName('remove')
      .setDescription('Remove an auto response')
      .addStringOption(opt => opt.setName('trigger').setDescription('The trigger to remove').setRequired(true))
    )
    .addSubcommand(sub => sub
      .setName('list')
      .setDescription('List all auto responses')
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guildId;

    if (sub === 'add') {
      const trigger = interaction.options.getString('trigger');
      const response = interaction.options.getString('response');
      addAutoRespond(guildId, trigger, response);
      return interaction.reply({ embeds: [{ color: 0x57F287, description: `✅ Auto response added!\n**Trigger:** ${trigger}\n**Response:** ${response}` }] });
    }

    if (sub === 'remove') {
      const trigger = interaction.options.getString('trigger');
      const removed = removeAutoRespond(guildId, trigger);
      if (!removed) return interaction.reply({ embeds: [{ color: 0xFF0000, description: `❌ Trigger \`${trigger}\` not found.` }], ephemeral: true });
      return interaction.reply({ embeds: [{ color: 0x57F287, description: `✅ Removed trigger \`${trigger}\`` }] });
    }

    if (sub === 'list') {
      const responds = getAutoResponds(guildId);
      if (!responds.size) return interaction.reply({ embeds: [{ color: 0xFF0000, description: '❌ No auto responses set.' }], ephemeral: true });
      const list = [...responds.entries()].map(([t, r]) => `**${t}** → ${r}`).join('\n');
      return interaction.reply({ embeds: [{ color: 0x5865F2, title: '🤖 Auto Responses', description: list }] });
    }
  }
};
