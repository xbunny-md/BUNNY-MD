module.exports = {
    config: commandConfig,
    execute: executeAutonomousCommand
};

const fs = require('fs');
const path = require('path');
const os = require('os');
const yts = require('yt-search');
const ytdl = require('ytdl-core');
const ffmpeg = require('fluent-ffmpeg');

/**
 * Metadata Configuration Block for Dynamic System Menu Generation
 */
const commandConfig = {
    name: 'play',
    alias: ['song', 'ytaudio'],
    category: 'download',
    description: 'Search and download music from YouTube with thumbnail preview.'
};

/**
 * Advanced Music Download Command Node
 */
async function executeAutonomousCommand(ctx) {
    const { sock, msg, from, state, args } = ctx;

    try {
        const query = args.join(' ');
        if (!query) {
            return await ctx.reply(`Usage: ${state.prefix || '.'}play <song name>`);
        }

        await sock.sendMessage(from, {
            react: { text: '🎵', key: msg.key }
        });

        const searchResult = await yts(query);
        if (!searchResult.videos.length) {
            return await ctx.reply(`No results found for "${query}"`);
        }

        const video = searchResult.videos[0];
        const videoUrl = video.url;
        const videoTitle = video.title;
        const videoAuthor = video.author.name;
        const videoDuration = video.timestamp;
        const thumbnailUrl = video.thumbnail;

        const infoPayload =
`╭─⌈ 🎵 *Music Found* ⌋
│ Title: ${videoTitle}
│ Artist: ${videoAuthor}
│ Duration: ${videoDuration}
│ Quality: 128kbps
╰⊷ Downloading audio...`;

        await sock.sendMessage(from, {
            image: { url: thumbnailUrl },
            caption: infoPayload
        }, { quoted: msg });

        const tempFilePath = path.join(os.tmpdir(), `${Date.now()}.mp3`);
        const audioStream = ytdl(videoUrl, { filter: 'audioonly', quality: 'highestaudio' });

        await new Promise((resolve, reject) => {
            ffmpeg(audioStream)
              .audioBitrate(128)
              .format('mp3')
              .save(tempFilePath)
              .on('end', resolve)
              .on('error', reject);
        });

        await sock.sendMessage(from, {
            audio: { url: tempFilePath },
            mimetype: 'audio/mpeg',
            fileName: `${videoTitle.replace(/[^a-zA-Z0-9 ]/g, '')}.mp3`
        }, { quoted: msg });

        if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);

    } catch (commandException) {
        console.error(`[Command Exception] Critical failure inside download/play.js execution tree:`, commandException.message);
        await ctx.reply(`\`\`Audio download failed. Try another song or check the link.\`\``);
    }
}