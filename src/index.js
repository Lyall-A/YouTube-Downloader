// setting up variables
const ytdl = require('ytdl-core');
const { search, getVideo } = require('youtube-sr').default;
const chalk = require('chalk');
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
const ffprobePath = require('@ffprobe-installer/ffprobe').path;
const ffmpeg = require('fluent-ffmpeg');
const prompts = require('prompts');
const fetch = require('node-fetch');
let totalTime = 0;
function write(text) {
    process.stdout.clearLine();
    process.stdout.cursorTo(0);
    return process.stdout.write(text);
}
function c() {
    console.log("");
}
const { resolve } = require('path');
const fs = require('fs');
const { execFile } = require('child_process');
const downloads = `${resolve(__dirname, '..')}\\YouTube Downloader`;
let searchLimit = 10; // change this if you want to search for more or less results
let quality = null;
let overwrite = false;
let format = null;
let audioBitrate = null;
let volume = null;
let framerate = null;
let videoBitrate = null;
let debug = false; // change this to true if you wnat debug mode, deleting that file also enables this
const presets = require(`${resolve(__dirname, '..')}\\presets.json`);
ffmpeg.setFfmpegPath(ffmpegPath);
ffmpeg.setFfprobePath(ffprobePath);

function getSupportedName(name) {
    return name.replaceAll("\\", "").replaceAll("/", "").replaceAll(":", "").replaceAll("*", "").replaceAll("?", "").replaceAll("\"", "").replaceAll("<", "").replaceAll(">", "").replaceAll("|", "");
}

async function downloadAudioFfmpeg(input, filename, download) {
    let supportedFilename = getSupportedName(filename);
    if (!download) {
        if (fs.existsSync(`${downloads}\\Audios\\${supportedFilename}.mp3`)) {
            let askOverwrite;
            if (overwrite) askOverwrite = { overwrite: "y" }
            if (!overwrite) askOverwrite = await prompts({
                type: 'text',
                name: 'overwrite',
                message: 'This has previously been downloaded, overwrite? \'Y/N\'',
                validate: response => response.toLowerCase() === "n" ? true : response.toLowerCase() === "y" ? true : "Invalid option"
            });

            if (askOverwrite.overwrite.toLowerCase() === "n") return;
            return downloadAudioFfmpeg(input, filename, true)
        } else {
            return downloadAudioFfmpeg(input, filename, true)
        }
    } else {
        write("Downloading audio")
        let audioFfmpeg = ffmpeg(input)
        if (audioBitrate) audioFfmpeg.audioBitrate(audioBitrate)
        if (volume) audioFfmpeg.addOutputOption('-filter:a', `volume=${volume}`)
        audioFfmpeg.save(`${downloads}\\Audios\\${supportedFilename}.mp3`)
        audioFfmpeg.on('codecData', (data) => {
            totalTime = parseInt(data.duration.replace(/:/g, ''));
        });
        audioFfmpeg.on('progress', (prog) => {
            if (prog.percent) return write(`${Math.round(prog.percent)}% Completed`)
            const calculatedProg = (parseInt(prog.timemark.replace(/:/g, '')) / totalTime) * 100;
            return write(`${Math.round(Number(calculatedProg))}% Completed`)
        });
        audioFfmpeg.on('error', (err) => {
            // if a error was found downloading audio
            write("An FFmpeg Error Occurred, Sorry!")
            if (debug) write(err)
            return;
        });
        audioFfmpeg.on('end', () => {
            write("Succesfully completed audio download!")
        });
    }
}

async function downloadVideoFfmpeg(audioInput, videoInput, filename, download) {
    let supportedFilename = getSupportedName(filename);
    if (!download) {
        if (fs.existsSync(`${downloads}\\Videos\\${supportedFilename}.mp4`)) {
            let askOverwrite;
            if (overwrite) askOverwrite = { overwrite: "y" }
            if (!overwrite) askOverwrite = await prompts({
                type: 'text',
                name: 'overwrite',
                message: 'This has previously been downloaded, overwrite? \'Y/N\'',
                validate: response => response.toLowerCase() === "n" ? true : response.toLowerCase() === "y" ? true : "Invalid option"
            });

            if (askOverwrite.overwrite.toLowerCase() === "n") return;
            return downloadVideoFfmpeg(audioInput, videoInput, filename, true)
        } else {
            return downloadVideoFfmpeg(audioInput, videoInput, filename, true)
        }
    } else {
        write("Downloading audio")
        let audioFfmpeg = ffmpeg(audioInput)
        if (audioBitrate) audioFfmpeg.audioBitrate(audioBitrate)
        if (volume) audioFfmpeg.addOutputOption('-filter:a', `volume=${volume}`)
        audioFfmpeg.save(`${downloads}\\Videos\\${supportedFilename}.mp3`)
        audioFfmpeg.on('error', (err) => {
            // if a error was found downloading audio
            write("An FFmpeg Error Occurred, Sorry!")
            if (debug) write(err)
            return;
        });
        audioFfmpeg.on('end', () => {
            write("Downloading video")
            let videoFfmpeg = ffmpeg(videoInput)
            videoFfmpeg.on('codecData', (data) => {
                totalTime = parseInt(data.duration.replace(/:/g, ''));
            });
            videoFfmpeg.on('progress', (prog) => {
                if (prog.percent) return write(`${Math.round(prog.percent)}% Completed`)
                const calculatedProg = (parseInt(prog.timemark.replace(/:/g, '')) / totalTime) * 100;
                return write(`${Math.round(Number(calculatedProg))}% Completed`)
            });
            if (quality) videoFfmpeg.size(`?x${quality}`)
            if (framerate) videoFfmpeg.fps(framerate)
            if (videoBitrate) videoFfmpeg.videoBitrate(videoBitrate);
            videoFfmpeg.addInput(`${downloads}\\Videos\\${supportedFilename}.mp3`)
            videoFfmpeg.save(`${downloads}\\Videos\\${supportedFilename}.mp4`)
            videoFfmpeg.on('error', (err) => {
                write("An FFmpeg Error Occurred, Sorry!")
                if (debug) write(err)
                return;
            })
            videoFfmpeg.on('end', () => {
                unlink()
                function unlink() {
                    fs.unlink(`${downloads}\\Videos\\${supportedFilename}.mp3`, (err) => {
                        if (err) unlink()
                    });
                }
                return write("Succesfully completed video download!")
            });
        });
    }
}

(async () => {

    // check if the file exists, if not then debug mode will be enabled
    if (!fs.existsSync(resolve(__dirname, '..') + "\\Delete this if you know what your doing")) debug = true;

    await fetch('https://raw.githubusercontent.com/lyall-pc/YouTube-Downloader/main/package.json').then(res => res.json()).then(package => {
        if (package.version !== require(`${resolve(__dirname, '..')}\\package.json`).version) {
            if (!fs.existsSync(`${resolve(__dirname, '..')}\\dev`)) {
                execFile('git', ['--version'], (err) => {
                    if (err) {
                        write("An update was found, but cannot automatically update. Please go to https://github.com/lyall-pc/YouTube-Downloader to update!")
                        c()
                        start()
                    } else {
                        execFile('git', ['stash', 'save'], (err) => {
                            execFile('git', ['pull'], (err) => {
                                if (err) {
                                    if (!debug) write("An update was found, but failed to automatically update. Please go to https://github.com/lyall-pc/YouTube-Downloader to update!")
                                    if (debug) write("An update was found, but failed to automatically update. Please go to https://github.com/lyall-pc/YouTube-Downloader to update! Error: " + err)
                                    c()
                                    start()
                                } else {
                                    write("Installed update, please restart!")
                                }
                            });
                        })
                    }
                });
            } else {
                start()
            }
        } else {
            start()
        }
    }).catch(err => {
        write("Could not check for update!")
        c()
        start()
    });

    async function start() {

        // if debug mode is on it runs this
        if (debug === true) {
            let old = { mkdirSync: fs.mkdirSync }
            write(chalk.red("DEBUG MODE IS ENABLED"))
            c()
            fs.mkdirSync = function (dir) {
                write(`Creating directory ${dir}`)
                c()
                old.mkdirSync(dir);
            }
        }

        // checks if download folders exist, if not then it automatically creates them
        if (!fs.existsSync(downloads)) fs.mkdirSync(downloads);
        if (!fs.existsSync(`${downloads}\\Videos`)) fs.mkdirSync(`${downloads}\\Videos`);
        if (!fs.existsSync(`${downloads}\\Audios`)) fs.mkdirSync(`${downloads}\\Audios`);

        if (Object.keys(presets).length !== 0) {
            let presetsFound = 0;
            let presetArray = [{ title: 'None', value: 'none' }];
            for (const preset in presets) {
                presetsFound += 1;
                presetArray.push({ title: presets[preset].name, value: preset })
                if (presetsFound === Object.keys(presets).length) {
                    const askPreset = await prompts({
                        type: 'select',
                        name: 'preset',
                        message: 'Found presets, select preset',
                        choices: presetArray
                    });

                    if (askPreset.preset !== "none") {
                        let presetOption = presets[preset].config

                        if (presetOption.videos) searchLimit = presetOption.videos
                        if (presetOption.quality) quality = presetOption.quality
                        if (presetOption.overwrite) overwrite = presetOption.overwrite
                        if (presetOption.format) format = presetOption.format
                        if (presetOption.videoBitrate) videoBitrate = presetOption.videoBitrate
                        if (presetOption.audioBitrate) audioBitrate = presetOption.audioBitrate
                        if (presetOption.framerate) framerate = presetOption.framerate
                        if (presetOption.volume) fovolumermat = presetOption.volume
                    }
                }
            };
        }

        // asking for the link or query
        const askYouTube = await prompts({
            type: 'text',
            name: 'youtube',
            message: 'Enter YouTube link or Search Query',
            validate: response => response === "" ? "You must enter a YouTube link or a Search Query" : true
        });


        // detect if answer is link or query
        if (askYouTube.youtube.startsWith('http')) { launch("link") } else { launch("search") }

        // launch the downloader
        async function launch(option) {
            // if it detected a search and not a link
            if (option === "search") {
                // get video details using youtube api
                const searched = await search(askYouTube.youtube, { limit: searchLimit });
                if (!searched[0]) {
                    return write(chalk.red("No results where found"))
                }

                let query = 0;
                let foundAll = false;
                let searchArray = [];
                let idArray = [];
                let rawSearchArray = [];
                // adding search results
                searched.forEach(each => {
                    query += 1;
                    let name;
                    if (each.title.length > 100) {
                        name = each.title.substring(0, 97) + "..."
                    } else name = each.title;
                    rawSearchArray.push(name)
                    searchArray.push(chalk.blue(query + ". ") + chalk.green(name));
                    idArray.push(each.id)
                    if (query === searchLimit) {
                        foundAll = true;
                        searchContinue()
                    }
                });
                setTimeout(() => {
                    // this is if it couldnt find the amount of results searched (or took to long)
                    if (!foundAll) searchContinue()
                }, 4000)
                async function searchContinue() {
                    let vidNum;
                    if (searchLimit !== 1) {
                        write("\n" + searchArray.join('\n') + "\n")
                        // ask what video you want to choose, 1 out of the specified limit

                        const askVid = await prompts({
                            type: 'number',
                            name: 'vid',
                            message: 'What one do you want?',
                            validate: response => !response ? "You must enter the YouTube Video number shown above" : response > query ? "Unknown Video" : response < 1 ? "Cannot be under 1" : true
                        });

                        vidNum = askVid.vid;
                    } else vidNum = 1;

                    // ask the format, mp4, mp3 or both 
                    let askFormat;
                    if (format) askFormat = { format }
                    if (!format) askFormat = await prompts({
                        type: 'select',
                        name: 'format',
                        message: 'What Format do you want to download?',
                        choices: [
                            { title: 'Audio', value: 'mp3' },
                            { title: 'Video', value: 'mp4' }
                        ],
                    });

                    if (askFormat.format !== "mp3") {
                        // ask the quality
                        let askQuality;
                        if (quality) askQuality = { quality }
                        if (!quality) {
                            askQuality = await prompts({
                                type: 'select',
                                name: 'quality',
                                message: 'What Quality do you want to download?',
                                choices: [
                                    { title: 'Default (1080p)', value: '1080' },
                                    { title: '144p', value: '144' },
                                    { title: '240p', value: '240' },
                                    { title: '360p', value: '360' },
                                    { title: '480p', value: '480' },
                                    { title: '720p', value: '720' },
                                    { title: '1080p (hd)', value: '1080' },
                                    { title: '1440p (hd)', value: '1440' },
                                    { title: '2160p (4k)', value: '2160' },
                                    { title: '4320p (8k)', value: '4320' }
                                ],
                            });
                            quality = askQuality.quality
                        }
                    }

                    let supportedFilename = getSupportedName(rawSearchArray[vidNum - 1]);

                    // if you chose mp4/video
                    if (askFormat.format === "mp4") return downloadVideoFfmpeg(ytdl(idArray[vidNum - 1], { quality: 'highestaudio' }), ytdl(idArray[vidNum - 1], { quality: 'highestvideo' }), supportedFilename)
                    // if you chose mp3/audio
                    if (askFormat.format === "mp3") return downloadAudioFfmpeg(ytdl(idArray[vidNum - 1], { quality: 'highestaudio' }), supportedFilename)
                }
                return;
            }
            if (option === "link") {
                let link = askYouTube.youtube;
                if (!link.split("/")[2].endsWith("youtu.be")) {
                    if (!link.split("/")[2].endsWith("youtube.com")) {
                        return write("Invalid URL")
                    }
                }

                let askFormat;
                if (format) askFormat = { format }
                if (!format) askFormat = await prompts({
                    type: 'select',
                    name: 'format',
                    message: 'What Format do you want to download?',
                    choices: [
                        { title: 'Audio', value: 'mp3' },
                        { title: 'Video', value: 'mp4' }
                    ],
                });

                const searched = await getVideo(link).catch(err => {
                    // if it failed to get video, log
                    return write("Failed to find video")
                });

                if (!searched) return; // this just stops the code below from running if no video was found

                if (askFormat.format !== "mp3") {
                    // ask the quality
                    let askQuality;
                    if (quality) askQuality = { quality }
                    if (!quality) {
                        askQuality = await prompts({
                            type: 'select',
                            name: 'quality',
                            message: 'What Quality do you want to download?',
                            choices: [
                                { title: 'Default (1080p)', value: '1080' },
                                { title: '144p', value: '144' },
                                { title: '240p', value: '240' },
                                { title: '360p', value: '360' },
                                { title: '480p', value: '480' },
                                { title: '720p', value: '720' },
                                { title: '1080p (hd)', value: '1080' },
                                { title: '1440p (hd)', value: '1440' },
                                { title: '2160p (4k)', value: '2160' },
                                { title: '4320p (8k)', value: '4320' }
                            ],
                        });
                        quality = askQuality.quality
                    }
                }


                let supportedFilename = getSupportedName(searched.title);

                if (askFormat.format === "mp4") return downloadVideoFfmpeg(ytdl(searched.id, { quality: 'highestaudio' }), ytdl(searched.id, { quality: 'highestvideo' }), supportedFilename);
                if (askFormat.format === "mp3") return downloadAudioFfmpeg(ytdl(searched.id, { quality: 'highestaudio' }), supportedFilename);
                return;
            }
        }
    }
})();