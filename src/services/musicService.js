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

    const res = await player.search(query, {
      requestedBy: member,
      searchEngine: QueryType.AUTO,
    });

    if (!res || !res.tracks.length) {
      throw new Error('No tracks found matching your query.');
    }

    const playlist = res.isPlaylist;
    const tracks = res.tracks;

    if (playlist) {
      queue.addTrack(tracks);
      return {
        success: true,
        type: 'playlist',
        count: tracks.length,
        playlistTitle: res.playlist?.title || 'Unknown Playlist',
      };
    } else {
      queue.addTrack(res.tracks[0]);
      return {
        success: true,
        type: 'track',
        track: res.tracks[0],
      };
    }
  } catch (error) {
    logger.error('Error playing track:', error);
    throw error;
  }
}

export function skipTrack(guildId) {
  try {
    const queue = player.nodes.get(guildId);
    if (!queue) throw new Error('No queue found for this guild.');
    if (!queue.currentTrack) throw new Error('No track currently playing.');

    const skipped = queue.node.skip();
    return skipped;
  } catch (error) {
    logger.error('Error skipping track:', error);
    throw error;
  }
}

export function stopQueue(guildId) {
  try {
    const queue = player.nodes.get(guildId);
    if (!queue) throw new Error('No queue found for this guild.');

    queue.delete();
    return true;
  } catch (error) {
    logger.error('Error stopping queue:', error);
    throw error;
  }
}

export function pauseQueue(guildId) {
  try {
    const queue = player.nodes.get(guildId);
    if (!queue) throw new Error('No queue found for this guild.');
    if (queue.node.isPaused()) throw new Error('Queue is already paused.');

    queue.node.setPaused(true);
    return true;
  } catch (error) {
    logger.error('Error pausing queue:', error);
    throw error;
  }
}

export function resumeQueue(guildId) {
  try {
    const queue = player.nodes.get(guildId);
    if (!queue) throw new Error('No queue found for this guild.');
    if (!queue.node.isPaused()) throw new Error('Queue is not paused.');

    queue.node.setPaused(false);
    return true;
  } catch (error) {
    logger.error('Error resuming queue:', error);
    throw error;
  }
}

export function setVolume(guildId, volume) {
  try {
    const queue = player.nodes.get(guildId);
    if (!queue) throw new Error('No queue found for this guild.');

    if (volume < 0 || volume > 200) {
      throw new Error('Volume must be between 0 and 200.');
    }

    queue.node.setVolume(volume);
    return volume;
  } catch (error) {
    logger.error('Error setting volume:', error);
    throw error;
  }
}

export function getQueueInfo(guildId) {
  try {
    const queue = player.nodes.get(guildId);
    if (!queue) return null;

    return {
      currentTrack: queue.currentTrack,
      tracks: queue.tracks,
      size: queue.size,
      isPaused: queue.node.isPaused(),
      volume: queue.node.volume,
      connection: queue.connection ? true : false,
    };
  } catch (error) {
    logger.error('Error getting queue info:', error);
    throw error;
  }
}

export function formatTime(ms) {
  const seconds = Math.floor((ms / 1000) % 60);
  const minutes = Math.floor((ms / (1000 * 60)) % 60);
  const hours = Math.floor((ms / (1000 * 60 * 60)) % 24);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}
