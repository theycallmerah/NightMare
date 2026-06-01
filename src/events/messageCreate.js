import { getLevelingConfig, getUserLevelData } from '../services/leveling.js';
import { checkAutoRespond } from '../services/autoRespondService.js';
import { Events } from 'discord.js';
import { logger } from '../utils/logger.js';
import { addXp } from '../services/xpSystem.js';

export default {
  name: Events.MessageCreate,
  async execute(message, client) {
    try {
      if (message.author.bot || !message.guild) return;
      await handleLeveling(message, client);
      await handleAutoRespond(message);
    } catch (error) {
      logger.error('Error in messageCreate event:', error);
    }
  }
};

async function handleLeveling(message, client) {
  try {
    const levelingConfig = await getLevelingConfig(client, message.guild.id);
    if (!levelingConfig?.enabled) return;
    if (levelingConfig.ignoredChannels?.includes(message.channel.id)) return;
    if (levelingConfig.ignoredRoles?.length > 0) {
      const member = await message.guild.members.fetch(message.author.id).catch(() => null);
      if (member && member.roles.cache.some(role => levelingConfig.ignoredRoles.includes(role.id))) return;
    }
    if (levelingConfig.blacklistedUsers?.includes(message.author.id)) return;
    if (!message.content || message.content.trim().length === 0) return;
    const userData = await getUserLevelData(client, message.guild.id, message.author.id);
    const cooldownTime = levelingConfig.xpCooldown || 60;
    const now = Date.now();
    const timeSinceLastMessage = now - (userData.lastMessage || 0);
    if (timeSinceLastMessage < cooldownTime * 1000) return;
    const minXP = levelingConfig.xpRange?.min || levelingConfig.xpPerMessage?.min || 15;
    const maxXP = levelingConfig.xpRange?.max || levelingConfig.xpPerMessage?.max || 25;
    const safeMinXP = Math.max(1, minXP);
    const safeMaxXP = Math.max(safeMinXP, maxXP);
    const xpToGive = Math.floor(Math.random() * (safeMaxXP - safeMinXP + 1)) + safeMinXP;
    let finalXP = xpToGive;
    if (levelingConfig.xpMultiplier && levelingConfig.xpMultiplier > 1) {
      finalXP = Math.floor(finalXP * levelingConfig.xpMultiplier);
    }
    const result = await addXp(client, message.guild, message.member, finalXP);
    if (result.success && result.leveledUp) {
      logger.info(`${message.author.tag} leveled up to level ${result.level} in ${message.guild.name}`);
    }
  } catch (error) {
    logger.error('Error handling leveling for message:', error);
  }
}

async function handleAutoRespond(message) {
  try {
    const response = checkAutoRespond(message.guild.id, message.content.trim());
    logger.info(`Auto respond check: guild=${message.guild.id} trigger="${message.content.trim()}" found=${!!response}`);
    if (response) {
      await message.delete().catch(() => {});
      await message.channel.send({ content: response, allowedMentions: { parse: ['everyone', 'here'] } })
        .catch(err => logger.error('Failed to send auto respond:', err));
    }
  } catch (error) {
    logger.error('Error in auto respond:', error);
  }
}
