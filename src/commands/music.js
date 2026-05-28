import { SlashCommandBuilder, ChannelType } from 'discord.js';
import {
  playTrack,
  skipTrack,
  stopQueue,
  pauseQueue,
  resumeQueue,
  setVolume,
  getQueueInfo,
  formatTime,
} from '../services/musicService.js';
import { logger } from '../utils/logger.js';

export default {
  data: new SlashCommandBuilder()
    .setName('music')
    .setDescription('🎵 Music player controls')
    .addSubcommand(subcommand =>
      subcommand
        .setName('play')
        .setDescription('Play a song or playlist')
        .addStringOption(option =>
          option
            .setName('query')
            .setDescription('Song name, artist, or YouTube URL')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('skip')
        .setDescription('Skip the current track')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('stop')
        .setDescription('Stop the music and clear the queue')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('pause')
        .setDescription('Pause the current track')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('resume')
        .setDescription('Resume the paused track')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('queue')
        .setDescription('View the current queue')
        .addNumberOption(option =>
          option
            .setName('page')
            .setDescription('Queue page number (default: 1)')
            .setMinValue(1)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('volume')
        .setDescription('Set the player volume')
        .addNumberOption(option =>
          option
            .setName('level')
            .setDescription('Volume level (0-200)')
            .setMinValue(0)
            .setMaxValue(200)
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('nowplaying')
        .setDescription('Show the currently playing track')
    ),

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();

    try {
      switch (subcommand) {
        case 'play':
          await handlePlay(interaction);
          break;
        case 'skip':
          await handleSkip(interaction);
          break;
        case 'stop':
          await handleStop(interaction);
          break;
        case 'pause':
          await handlePause(interaction);
          break;
        case 'resume':
          await handleResume(interaction);
          break;
        case 'queue':
          await handleQueue(interaction);
          break;
        case 'volume':
          await handleVolume(interaction);
          break;
        case 'nowplaying':
          await handleNowPlaying(interaction);
          break;
      }
    } catch (error) {
      logger.error(`Music command error (${subcommand}):`, error);
      const errorMessage = error.message || 'An error occurred while processing your request.';

      if (interaction.replied) {
        await interaction.followUp({
          embeds: [{
            color: 0xff0000,
            title: '❌ Error',
            description: errorMessage,
          }],
          ephemeral: true,
        });
      } else {
        await interaction.reply({
          embeds: [{
            color: 0xff0000,
            title: '❌ Error',
            description: errorMessage,
          }],
          ephemeral: true,
        });
      }
    }
  },
};

async function handlePlay(interaction) {
  await interaction.deferReply();

  const voiceChannel = interaction.member.voice.channel;
  if (!voiceChannel) {
    return await interaction.editReply({
      embeds: [{
        color: 0xff0000,
        title: '❌ Error',
        description: 'You must be in a voice channel to play music.',
      }],
    });
  }

  if (voiceChannel.type !== ChannelType.GuildVoice && voiceChannel.type !== ChannelType.GuildStage) {
    return await interaction.editReply({
      embeds: [{
        color: 0xff0000,
        title: '❌ Error',
        description: 'You must be in a voice or stage channel.',
      }],
    });
  }

  const query = interaction.options.getString('query');

  const result = await playTrack(
    query,
    interaction.guild,
    interaction.channel,
    voiceChannel,
    interaction.user
  );

  if (result.type === 'playlist') {
    await interaction.editReply({
      embeds: [{
        color: 0x2f3136,
        title: '✅ Playlist Added',
        description: `Added **${result.count}** songs from **${result.playlistTitle}** to the queue.`,
        footer: { text: 'Use /music queue to view the queue' },
      }],
    });
  } else {
    const track = result.track;
    await interaction.editReply({
      embeds: [{
        color: 0x2f3136,
        title: '✅ Track Added',
        description: `Added [${track.title}](${track.url}) to the queue.`,
        fields: [
          { name: 'Artist', value: track.author, inline: true },
          { name: 'Duration', value: `\`${formatTime(track.durationMS)}\``, inline: true },
        ],
        thumbnail: { url: track.thumbnail },
        footer: { text: 'Now playing...' },
      }],
    });
  }
}

async function handleSkip(interaction) {
  await interaction.deferReply();

  const queueInfo = getQueueInfo(interaction.guildId);
  if (!queueInfo) {
    return await interaction.editReply({
      embeds: [{
        color: 0xff0000,
        title: '❌ Error',
        description: 'No music is currently playing.',
      }],
    });
  }

  skipTrack(interaction.guildId);

  await interaction.editReply({
    embeds: [{
      color: 0x2f3136,
      title: '⏭️ Skipped',
      description: 'Skipped to the next track.',
    }],
  });
}

async function handleStop(interaction) {
  await interaction.deferReply();

  const queueInfo = getQueueInfo(interaction.guildId);
  if (!queueInfo) {
    return await interaction.editReply({
      embeds: [{
        color: 0xff0000,
        title: '❌ Error',
        description: 'No music is currently playing.',
      }],
    });
  }

  stopQueue(interaction.guildId);

  await interaction.editReply({
    embeds: [{
      color: 0x2f3136,
      title: '⏹️ Stopped',
      description: 'Music player stopped and queue cleared.',
    }],
  });
}

async function handlePause(interaction) {
  await interaction.deferReply();

  const queueInfo = getQueueInfo(interaction.guildId);
  if (!queueInfo) {
    return await interaction.editReply({
      embeds: [{
        color: 0xff0000,
        title: '❌ Error',
        description: 'No music is currently playing.',
      }],
    });
  }

  pauseQueue(interaction.guildId);

  await interaction.editReply({
    embeds: [{
      color: 0x2f3136,
      title: '⏸️ Paused',
      description: 'Music paused. Use `/music resume` to continue.',
    }],
  });
}

async function handleResume(interaction) {
  await interaction.deferReply();

  const queueInfo = getQueueInfo(interaction.guildId);
  if (!queueInfo) {
    return await interaction.editReply({
      embeds: [{
        color: 0xff0000,
        title: '❌ Error',
        description: 'No music is currently playing.',
      }],
    });
  }

  resumeQueue(interaction.guildId);

  await interaction.editReply({
    embeds: [{
      color: 0x2f3136,
      title: '▶️ Resumed',
      description: 'Music resumed.',
    }],
  });
}

async function handleQueue(interaction) {
  await interaction.deferReply();

  const queueInfo = getQueueInfo(interaction.guildId);
  if (!queueInfo || !queueInfo.currentTrack) {
    return await interaction.editReply({
      embeds: [{
        color: 0xff0000,
        title: '❌ Error',
        description: 'No music is currently playing.',
      }],
    });
  }

  const page = interaction.options.getNumber('page') || 1;
  const itemsPerPage = 10;
  const tracks = queueInfo.tracks;
  const totalPages = Math.ceil(tracks.length / itemsPerPage);

  if (page > totalPages && totalPages > 0) {
    return await interaction.editReply({
      embeds: [{
        color: 0xff0000,
        title: '❌ Error',
        description: `Page ${page} does not exist. Total pages: ${totalPages}`,
      }],
    });
  }

  const start = (page - 1) * itemsPerPage;
  const end = Math.min(start + itemsPerPage, tracks.length);
  const paginatedTracks = tracks.slice(start, end);

  const queueList = paginatedTracks
    .map((track, index) => `**${start + index + 1}.** [${track.title}](${track.url}) - \`${formatTime(track.durationMS)}\``)
    .join('\n');

  await interaction.editReply({
    embeds: [{
      color: 0x2f3136,
      title: '🎵 Queue',
      description: queueList || 'No upcoming tracks.',
      fields: [
        {
          name: 'Now Playing',
          value: `[${queueInfo.currentTrack.title}](${queueInfo.currentTrack.url})`,
          inline: false,
        },
        {
          name: 'Queue Size',
          value: `${tracks.length} songs`,
          inline: true,
        },
        {
          name: 'Status',
          value: queueInfo.isPaused ? '⏸️ Paused' : '▶️ Playing',
          inline: true,
        },
        {
          name: 'Volume',
          value: `${queueInfo.volume}%`,
          inline: true,
        },
      ],
      footer: { text: `Page ${page} of ${totalPages || 1}` },
    }],
  });
}

async function handleVolume(interaction) {
  await interaction.deferReply();

  const volume = interaction.options.getNumber('level');

  const queueInfo = getQueueInfo(interaction.guildId);
  if (!queueInfo) {
    return await interaction.editReply({
      embeds: [{
        color: 0xff0000,
        title: '❌ Error',
        description: 'No music is currently playing.',
      }],
    });
  }

  setVolume(interaction.guildId, volume);

  await interaction.editReply({
    embeds: [{
      color: 0x2f3136,
      title: '🔊 Volume Changed',
      description: `Volume set to **${volume}%**.`,
    }],
  });
}

async function handleNowPlaying(interaction) {
  await interaction.deferReply();

  const queueInfo = getQueueInfo(interaction.guildId);
  if (!queueInfo || !queueInfo.currentTrack) {
    return await interaction.editReply({
      embeds: [{
        color: 0xff0000,
        title: '❌ Error',
        description: 'No music is currently playing.',
      }],
    });
  }

  const track = queueInfo.currentTrack;

  await interaction.editReply({
    embeds: [{
      color: 0x2f3136,
      title: '🎵 Now Playing',
      description: `[${track.title}](${track.url})`,
      fields: [
        { name: 'Artist', value: track.author, inline: true },
        { name: 'Duration', value: `\`${formatTime(track.durationMS)}\``, inline: true },
        { name: 'Status', value: queueInfo.isPaused ? '⏸️ Paused' : '▶️ Playing', inline: true },
        { name: 'Queue Length', value: `\`${queueInfo.size}\``, inline: true },
        { name: 'Volume', value: `\`${queueInfo.volume}%\``, inline: true },
      ],
      thumbnail: { url: track.thumbnail },
    }],
  });
}
