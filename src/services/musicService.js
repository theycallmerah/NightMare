import { Player, QueryType } from 'discord-player';
import { logger } from '../utils/logger.js';

let player = null;

export function initializePlayer(client) {
  try {
    player = new Player(client, {
      leaveOnEmpty: true,
      leaveOnEmptyCooldown: 300000,
      deafenOnJoin: true,
      onSkip: true,
    });

    player.on('error', (queue, error) => {
      logger.error(`Music Player Error in ${queue.metadata?.guildId}:`, error);
    });

    player.on('playerError', (queue, error) => {
      logger.error(`Player Error in ${queue.metadata?.guildId}:`, error);
    });

    player.on('trackStart', (queue, track) => {
      const channel = queue.metadata?.textChannel;
      if (channel) {
        channel.send({
          embeds: [{
            color: 0x2f3136,
            title: '🎵 Now Playing',
            description: `[${track.title}](${track.url})`,
            fields: [
              { name: 'Artist', value: track.author, inline: true },
              { name: 'Duration', value: `\`${track.durationMS ? formatTime(track.durationMS) : 'Live'}\``, inline: true },
              { name: 'Queue Length', value: `\`${queue.size}\``, inline: true },
            ],
            thumbnail: { url: track.thumbnail },
          }]
        }).catch(err => logger.error('Failed to send track start message:', err));
      }
    });

    player.on('queueEnd', (queue) => {
      const channel = queue.metadata?.textChannel;
      if (channel) {
        channel.send({
          embeds: [{
            color: 0x2f3136,
            title: '⏹️ Queue Ended',
            description: 'No more songs in the queue. Leaving voice channel.',
          }]
        }).catch(err => logger.error('Failed to send queue end message:', err));
      }
    });

    logger.info('✅ Discord Player initialized');
    return player;
  } catch (error) {
    logger.error('Failed to initialize Discord Player:', error);
    throw error;
  }
}

export function getPlayer() {
  return player;
}

export async function playTrack(query, guild, textChannel, voiceChannel, member) {
  try {
    if (!player) throw new Error('Player not initialized');

    let queue = player.nodes.get(guild.id);

    if (!queue) {
      queue = player.nodes.create(guild.id, {
        metadata: {
          guildId: guild.id,
          textChannel,
          voiceChannel,
        },
        leaveOnEmpty: true,
        leaveOnEmptyCooldown: 300000,
        deafenOnJoin: true,
      });
    }

    if (!queue.connection) {
      try {
        await queue.connect(voiceChannel);
      } catch (error) {
        logger.error('Failed to connect to voice channel:', error);
        throw new Error('Could not connect to voice channel. Make sure I have permission to join and speak.');
      }
    }

    // FIXED: Changed QueryType.AUTO to QueryType.SOUNDCLOUD_SEARCH to prevent YouTube blocks
    const res = await player.search(query, {
      requestedBy: member,
      searchEngine: QueryType.SOUNDCLOUD_SEARCH,
    });

... (130 lines left)
