import { Player, QueryType } from 'discord-player';
import { DefaultExtractors } from '@discord-player/extractor';
import { logger } from '../utils/logger.js';

let player = null;

export async function initializePlayer(client) {
  try {
    player = new Player(client, {
      leaveOnEmpty: true,
      leaveOnEmptyCooldown: 300000,
      selfDeaf: true,
    });

    import { DefaultExtractors } from '@discord-player/extractor';
await player.extractors.loadMulti(DefaultExtractors);

    player.events.on('playerStart', (queue, track) => {
      const channel = queue.metadata?.textChannel;
      if (channel) {
        channel.send({ embeds: [{ color: 0x2f3136, title: '🎵 Now Playing', description: `[${track.title}](${track.url})`, thumbnail: { url: track.thumbnail } }] }).catch(() => {});
      }
    });

    player.events.on('emptyQueue', (queue) => {
      const channel = queue.metadata?.textChannel;
      if (channel) {
        channel.send({ embeds: [{ color: 0x2f3136, title: '⏹️ Queue Ended', description: 'No more songs.' }] }).catch(() => {});
      }
    });

    logger.info('Discord Player initialized');
    return player;
  } catch (error) {
    logger.error('Failed to initialize Discord Player:', error);
    throw error;
  }
}

export function getPlayer() { return player; }

export async function playTrack(query, guild, textChannel, voiceChannel, member) {
  try {
    if (!player) throw new Error('Player not initialized');

    let queue = player.nodes.get(guild.id);
    if (!queue) {
      queue = player.nodes.create(guild.id, {
        metadata: { guildId: guild.id, textChannel, voiceChannel },
        leaveOnEmpty: true,
        leaveOnEmptyCooldown: 300000,
        selfDeaf: true,
        bufferingTimeout: 3000,
      });
    }

    if (!queue.connection) await queue.connect(voiceChannel);

    const res = await player.search(query, { requestedBy: member, searchEngine: QueryType.AUTO });
    if (!res || !res.tracks.length) throw new Error('No tracks found matching your query.');

    if (res.isPlaylist) {
      queue.addTrack(res.tracks);
      if (!queue.node.isPlaying()) await queue.node.play();
      return { success: true, type: 'playlist', count: res.tracks.length, playlistTitle: res.playlist?.title || 'Unknown Playlist' };
    } else {
      queue.addTrack(res.tracks[0]);
      if (!queue.node.isPlaying()) await queue.node.play();
      return { success: true, type: 'track', track: res.tracks[0] };
    }
  } catch (error) {
    logger.error('Error playing track:', error);
    throw error;
  }
}

export function skipTrack(guildId) {
  const queue = player.nodes.get(guildId);
  if (!queue) throw new Error('No queue found.');
  if (!queue.currentTrack) throw new Error('No track playing.');
  queue.node.skip();
  return true;
}

export function stopQueue(guildId) {
  const queue = player.nodes.get(guildId);
  if (!queue) throw new Error('No queue found.');
  queue.delete();
  return true;
}

export function pauseQueue(guildId) {
  const queue = player.nodes.get(guildId);
  if (!queue) throw new Error('No queue found.');
  if (queue.node.isPaused()) throw new Error('Already paused.');
  queue.node.setPaused(true);
  return true;
}

export function resumeQueue(guildId) {
  const queue = player.nodes.get(guildId);
  if (!queue) throw new Error('No queue found.');
  if (!queue.node.isPaused()) throw new Error('Not paused.');
  queue.node.setPaused(false);
  return true;
}

export function setVolume(guildId, volume) {
  const queue = player.nodes.get(guildId);
  if (!queue) throw new Error('No queue found.');
  if (volume < 0 || volume > 200) throw new Error('Volume must be between 0 and 200.');
  queue.node.setVolume(volume);
  return volume;
}

export function getQueueInfo(guildId) {
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
}

export function formatTime(ms) {
  const seconds = Math.floor((ms / 1000) % 60);
  const minutes = Math.floor((ms / (1000 * 60)) % 60);
  const hours = Math.floor((ms / (1000 * 60 * 60)) % 24);
  if (hours > 0) return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}
