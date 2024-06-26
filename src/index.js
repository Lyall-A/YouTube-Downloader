// setting up variables
const ytdl = require('ytdl-core');
const { search, getVideo } = require('youtube-sr').default;
const chalk = require('chalk');
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
const ffprobePath = require('@ffprobe-installer/ffprobe').path;
const ffmpeg = require('fluent-ffmpeg');
const prompts = require('prompts');
const fetch = require('node-fetch');
const request = require('request');
const qualitys = [
    { title: '4320p (8K)', value: '4320' },
    { title: '2160p (4K)', value: '2160' },
    { title: '1440p (HD)', value: '1440' },
    { title: '1080p (HD)', value: '1080' },
    { title: '720p', value: '720' },
    { title: '480p', value: '480' },
    { title: '360p', value: '360' },
    { title: '240p', value: '240' },
    { title: '144p', value: '144' }
];
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
let dirname = __dirname.replace(/\//g, "\\");
const fs = require('fs');
const defaultPresets = require(`${dirname}\\default.presets.json`);
const defaultConfig = require(`${dirname}\\default.config.json`);
let presetLoc = `${dirname}\\presets.json`;
let configLoc = `${dirname}\\config.json`;
if (!fs.existsSync(`${dirname}\\presets.json`)) presetLoc = `${dirname}\\default.presets.json`;
if (!fs.existsSync(`${dirname}\\config.json`)) configLoc = `${dirname}\\default.config.json`;
const { execFile } = require('child_process');
const downloads = `${resolve(dirname, '..')}\\YouTube Downloader`;
let usingPreset = false;
let config = require(configLoc);
let { enableWeb, webPort, presetName, forcemp4, metadata, searchLimit, quality, overwrite, format, bass, treble, audioBitrate, volume, framerate, videoBitrate, debug } = config;
const presets = require(presetLoc);
ffmpeg.setFfmpegPath(ffmpegPath);
ffmpeg.setFfprobePath(ffprobePath);
let express;
let app;
let online = false;
if (enableWeb) {
    express = require('express');
    app = express();
}

function getSupportedName(name) {
    if (!name) return console.log("Could not get the name")
    return name.replaceAll("\\", "").replaceAll("/", "").replaceAll(":", "").replaceAll("*", "").replaceAll("?", "").replaceAll("\"", "").replaceAll("<", "").replaceAll(">", "").replaceAll("|", "");
}

async function end() {
    c();
    const askRestart = await prompts({
        type: 'text',
        name: 'restart',
        message: 'Download another? \'Y/N\'',
        validate: response => response.toLowerCase() === "n" ? true : response.toLowerCase() === "y" ? true : "Invalid option"
    });
    if (askRestart.restart.toLowerCase() === "n") return;
    return start();
}

async function downloadAudioFfmpeg(liveContent, input, filename, thumbnail, id, download) {
    let supportedFilename = getSupportedName(filename);
    let usedFilename = `${downloads}\\Audios\\${supportedFilename}`;
    if (presetName) {
        if (usingPreset) usedFilename = `${downloads}\\Audios\\${supportedFilename} (${getSupportedName(usingPreset)})`;
    }
    if (!download) {
        if (fs.existsSync(`${usedFilename}.mp3`)) {
            let askOverwrite;
            if (overwrite) askOverwrite = { overwrite: "y" }
            if (!overwrite) askOverwrite = await prompts({
                type: 'text',
                name: 'overwrite',
                message: 'This has previously been downloaded, overwrite? \'Y/N\'',
                validate: response => response.toLowerCase() === "n" ? true : response.toLowerCase() === "y" ? true : "Invalid option"
            });

            if (askOverwrite.overwrite.toLowerCase() === "n") return;
            return downloadAudioFfmpeg(liveContent, input, filename, thumbnail, id, true)
        } else {
            return downloadAudioFfmpeg(liveContent, input, filename, thumbnail, id, true)
        }
    } else {
        write("Getting ready to start downloading...")
        if (thumbnail) {
            if (metadata) {
                request.head(thumbnail, (err) => {
                    if (err) return startAudioDownload(false, ytdl(id, { quality: 'highestaudio' }));
                    let thumbPipe = request(thumbnail).pipe(fs.createWriteStream(`${usedFilename}.png`));
                    thumbPipe.on('finish', () => {
                        startAudioDownload(true)
                    });
                    thumbPipe.on('error', () => {
                        startAudioDownload(false, ytdl(id, { quality: 'highestaudio' }))
                    });
                });
            } else {
                startAudioDownload(false, ytdl(id, { quality: 'highestaudio' }))
            }
        } else {
            startAudioDownload(false, ytdl(id, { quality: 'highestaudio' }))
        }
        function startAudioDownload(thumb, newInput) {
            let usedInput = input;
            if (newInput) usedInput = newInput;

            let audioFfmpeg = ffmpeg(usedInput)
            if (audioBitrate) audioFfmpeg.audioBitrate(audioBitrate)
            if (volume) audioFfmpeg.addOutputOption('-filter:a', `volume=${volume}`)
            if (bass) {
                if (treble) {
                    audioFfmpeg.addOutputOptions(`-af`, `bass=g=${bass},treble=g=${treble}`)
                } else {
                    audioFfmpeg.addOutputOptions(`-af`, `bass=g=${bass}`)
                }
            } else {
                if (treble) {
                    audioFfmpeg.addOutputOptions(`-af`, `treble=g=${treble}`)
                }
            }
            if (thumb) {
                audioFfmpeg.addInput(`${usedFilename}.png`)
                audioFfmpeg.addOutputOptions(`-map`, `0:0`, `-map`, `1:0`, `-id3v2_version`, `3`)
            }
            if (!metadata) audioFfmpeg.addOutputOptions(`-map_metadata`, `-1`)
            audioFfmpeg.save(`${usedFilename}.mp3`)
            audioFfmpeg.on('codecData', (data) => {
                totalTime = parseInt(data.duration.replace(/:/g, ''));
            });
            audioFfmpeg.on('progress', (prog) => {
                if (!liveContent) {
                    if (prog.percent) return write(`${Math.round(prog.percent)}% Completed`)
                    const calculatedProg = (parseInt(prog.timemark.replace(/:/g, '')) / totalTime) * 100;
                    return write(`${Math.round(Number(calculatedProg))}% Completed`)
                } else {
                    write(`Downloading live content, length downloaded: ${prog.timemark.replace(/00:/g, "").split(".")[0]}`)
                }
            });
            audioFfmpeg.on('error', (err) => {
                if (fs.existsSync(`${usedFilename}.mp3`)) {
                    unlink()
                    function unlink() {
                        fs.unlink(`${usedFilename}.mp3`, (err) => {
                            if (err) unlink()
                        })
                    }
                }

                if (!err.message.includes("Could not write header for output file")) {
                    // if a error was found downloading audio
                    write("An error occurred, Sorry!")
                    if (debug) write(err.message)
                    return;
                } else {
                    if (fs.existsSync(`${usedFilename}.png`)) {
                        unlinkThumb()
                        function unlinkThumb() {
                            fs.unlink(`${usedFilename}.png`, (err) => {
                                if (err) unlinkThumb()
                            })
                        }
                    }

                    return startAudioDownload(false, ytdl(id, { quality: 'highestaudio' }))
                }
            });
            audioFfmpeg.on('end', () => {
                if (fs.existsSync(`${usedFilename}.png`)) {
                    unlinkThumb()
                    function unlinkThumb() {
                        fs.unlink(`${usedFilename}.png`, (err) => {
                            if (err) unlinkThumb()
                        })
                    }
                }
                write("Succesfully completed download!")
                end()
            });
        }
    }
}

async function downloadVideoFfmpeg(liveContent, audioInput, videoInput, filename, download) {
    let supportedFilename = getSupportedName(filename);
    let usedFilename = `${downloads}\\Videos\\${supportedFilename}`;
    if (presetName) {
        if (usingPreset) usedFilename = `${downloads}\\Videos\\${supportedFilename} (${getSupportedName(usingPreset)})`;
    }
    if (!download) {
        if (fs.existsSync(`${usedFilename}.mp4`)) {
            let askOverwrite;
            if (overwrite) askOverwrite = { overwrite: "y" }
            if (!overwrite) askOverwrite = await prompts({
                type: 'text',
                name: 'overwrite',
                message: 'This has previously been downloaded, overwrite? \'Y/N\'',
                validate: response => response.toLowerCase() === "n" ? true : response.toLowerCase() === "y" ? true : "Invalid option"
            });

            if (askOverwrite.overwrite.toLowerCase() === "n") return;
            return downloadVideoFfmpeg(liveContent, audioInput, videoInput, filename, true)
        } else {
            return downloadVideoFfmpeg(liveContent, audioInput, videoInput, filename, true)
        }
    } else {
        write("Getting ready to start downloading...")
        if (!liveContent) {
            let audioFfmpeg = ffmpeg(audioInput)
            if (audioBitrate) audioFfmpeg.audioBitrate(audioBitrate)
            if (volume) audioFfmpeg.addOutputOption('-filter:a', `volume=${volume}`)
            if (bass) {
                if (treble) {
                    audioFfmpeg.addOutputOptions(`-af`, `bass=g=${bass},treble=g=${treble}`)
                } else {
                    audioFfmpeg.addOutputOptions(`-af`, `bass=g=${bass}`)
                }
            } else {
                if (treble) {
                    audioFfmpeg.addOutputOptions(`-af`, `treble=g=${treble}`)
                }
            }
            if (!metadata) audioFfmpeg.addOutputOptions(`-map_metadata`, `-1`)
            audioFfmpeg.save(`${usedFilename}.mp3`)
            audioFfmpeg.on('error', (err) => {
                if (fs.existsSync(`${usedFilename}.mp3`)) {
                    unlink()
                    function unlink() {
                        fs.unlink(`${usedFilename}.mp3`, (err) => {
                            if (err) unlink()
                        })
                    }
                }
                // if a error was found downloading audio
                write("An error occurred, Sorry!")
                if (debug) write(err.message)
                return;
            });
            audioFfmpeg.on('end', () => {
                onEndDownload()
            });
        } else {
            onEndDownload()
        }
        function onEndDownload() {
            let fileFormat = "mp4";
            if (!forcemp4) if (liveContent) fileFormat = "flv";
            let videoFfmpeg = ffmpeg(videoInput)
            videoFfmpeg.on('codecData', (data) => {
                totalTime = parseInt(data.duration.replace(/:/g, ''));
            });
            videoFfmpeg.on('progress', (prog) => {
                if (!liveContent) {
                    if (prog.percent) return write(`${Math.round(prog.percent)}% Completed`)
                    const calculatedProg = (parseInt(prog.timemark.replace(/:/g, '')) / totalTime) * 100;
                    return write(`${Math.round(Number(calculatedProg))}% Completed`)
                } else {
                    write(`Downloading live content, length downloaded: ${prog.timemark.replace(/00:/g, "").split(".")[0]}`)
                }
            });
            if (quality) videoFfmpeg.size(`?x${quality}`)
            if (framerate) videoFfmpeg.fps(framerate)
            if (videoBitrate) videoFfmpeg.videoBitrate(videoBitrate);
            if (!liveContent) videoFfmpeg.addInput(`${usedFilename}.mp3`);
            if (liveContent) {
                videoFfmpeg.videoCodec("flv");
                if (audioBitrate) videoFfmpeg.audioBitrate(audioBitrate)
                if (volume) videoFfmpeg.addOutputOption('-filter:a', `volume=${volume}`)
                if (bass) {
                    if (treble) {
                        videoFfmpeg.addOutputOptions(`-af`, `bass=g=${bass},treble=g=${treble}`)
                    } else {
                        videoFfmpeg.addOutputOptions(`-af`, `bass=g=${bass}`)
                    }
                } else {
                    if (treble) {
                        videoFfmpeg.addOutputOptions(`-af`, `treble=g=${treble}`)
                    }
                }
            }
            if (!liveContent) videoFfmpeg.videoCodec("libx264")
            if (!metadata) videoFfmpeg.addOutputOptions(`-map_metadata`, `-1`)
            videoFfmpeg.save(`${usedFilename}.${fileFormat}`)
            videoFfmpeg.on('error', (err) => {
                if (fs.existsSync(`${usedFilename}.mp3`)) {
                    unlink()
                    function unlink() {
                        fs.unlink(`${usedFilename}.mp3`, (err) => {
                            if (err) unlink()
                        })
                    }
                }
                if (fs.existsSync(`${usedFilename}.${fileFormat}`)) {
                    unlink()
                    function unlink() {
                        fs.unlink(`${usedFilename}.${fileFormat}`, (err) => {
                            if (err) unlink()
                        })
                    }
                }
                write("An error occurred, Sorry!")
                if (debug) write(err.message)
                return;
            })
            videoFfmpeg.on('end', () => {
                if (fs.existsSync(`${usedFilename}.mp3`)) {
                    unlink()
                    function unlink() {
                        fs.unlink(`${usedFilename}.mp3`, (err) => {
                            if (err) unlink()
                        });
                    }
                }
                write("Succesfully completed download!")
                end()
            });
        }
    }
}

(async () => {
    await fetch('https://raw.githubusercontent.com/lyall-pc/YouTube-Downloader/main/package.json').then(res => res.json()).then(package => {
        if (package.version !== require(`${resolve(dirname, '..')}\\package.json`).version) {
            if (!fs.existsSync(`${resolve(dirname, '..')}\\no_update`)) {
                execFile('git', ['--version'], (err) => {
                    if (err) {
                        write("An update was found, but cannot automatically update. Please go to https://github.com/lyall-pc/YouTube-Downloader to update!")
                        c()
                        start()
                    } else {
                        execFile('git', ['config', '--global', '--add', 'safe.directory', `${resolve(__dirname, '..').replaceAll("\\", "/")}`], (err) => {
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
                            });
                        });
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
})();


// if debug mode is on it runs this
if (debug === true) {
    let old = { mkdirSync: fs.mkdirSync, writeFileSync: fs.writeFileSync }
    write(chalk.red("DEBUG MODE IS ENABLED"))
    c()
    fs.mkdirSync = function (dir) {
        write(`Creating directory ${dir}`)
        c()
        old.mkdirSync(dir);
    }
    fs.writeFileSync = function (file, data) {
        write(`Creating file ${file}`)
        c()
        old.writeFileSync(file, data);
    }
}

// checks if download folders exist, if not then it automatically creates them
if (!fs.existsSync(downloads)) fs.mkdirSync(downloads);
if (!fs.existsSync(`${downloads}\\Videos`)) fs.mkdirSync(`${downloads}\\Videos`);
if (!fs.existsSync(`${downloads}\\Audios`)) fs.mkdirSync(`${downloads}\\Audios`);
if (!fs.existsSync(`${dirname}\\presets.json`)) fs.writeFileSync(`${dirname}\\presets.json`, JSON.stringify(defaultPresets, null, 4));
if (!fs.existsSync(`${dirname}\\config.json`)) fs.writeFileSync(`${dirname}\\config.json`, JSON.stringify(defaultConfig, null, 4));

async function start() {

    usingPreset = false;
    metadata = config.metadata;
    searchLimit = config.searchLimit;
    quality = config.quality;
    overwrite = config.overwrite;
    format = config.format;
    bass = config.bass;
    treble = config.treble;
    audioBitrate = config.audioBitrate;
    volume = config.volume;
    framerate = config.framerate;
    videoBitrate = config.videoBitrate;

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
                    usingPreset = presets[askPreset.preset].name;
                    let presetOption = presets[askPreset.preset].config

                    if (presetOption.metadata !== null) metadata = presetOption.metadata
                    if (presetOption.videos !== null) searchLimit = presetOption.videos
                    if (presetOption.quality !== null) quality = presetOption.quality
                    if (presetOption.overwrite !== null) overwrite = presetOption.overwrite
                    if (presetOption.format !== null) format = presetOption.format
                    if (presetOption.videoBitrate !== null) videoBitrate = presetOption.videoBitrate
                    if (presetOption.audioBitrate !== null) audioBitrate = presetOption.audioBitrate
                    if (presetOption.bass !== null) bass = presetOption.bass
                    if (presetOption.treble !== null) treble = presetOption.treble
                    if (presetOption.framerate !== null) framerate = presetOption.framerate
                    if (presetOption.volume !== null) volume = presetOption.volume
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
            let searchArray = [];
            // adding search results
            searched.forEach(async each => {
                query += 1;
                let name;
                if (each.title.length > 100) {
                    name = each.title.substring(0, 97) + "..."
                } else name = each.title;
                searchArray.push({ title: chalk.blue(query + ". ") + chalk.green(name), value: `${query}` });
                if (query === searched.length) {
                    let vidNum;
                    if (searchLimit !== 1) {
                        // ask what video you want to choose, 1 out of the specified limit

                        const askVid = await prompts({
                            type: 'select',
                            name: 'vid',
                            choices: searchArray,
                            message: 'What one do you want?',
                        });

                        vidNum = askVid.vid;
                    } else vidNum = 1;
                    let liveContent = false;

                    if (searched[vidNum - 1].live) liveContent = true;
                    const searchedId = await getVideo(`https://youtu.be/${searched[vidNum - 1].id}`).catch(() => { });
                    if (searchedId.live) liveContent = true;

                    // ask the format, mp4, mp3 or both 
                    let askFormat;
                    if (format) askFormat = { format }
                    if (!format) askFormat = await prompts({
                        type: 'select',
                        name: 'format',
                        message: 'What Format do you want to download?',
                        choices: [
                            { title: 'Video', value: 'mp4' },
                            { title: 'Audio', value: 'mp3' }
                        ],
                    });

                    if (askFormat.format !== "mp3") {
                        // ask the quality
                        let askQuality;
                        let supportedQuality = [];
                        let qualitysRan = 0;
                        qualitys.forEach(quality => {
                            qualitysRan += 1;
                            if (Number(quality.value) <= searchedId.adaptiveFormats[0].height) supportedQuality.push(quality);
                        });
                        if (quality) askQuality = { quality }
                        if (!quality) {
                            askQuality = await prompts({
                                type: 'select',
                                name: 'quality',
                                message: 'What Quality do you want to download?',
                                choices: supportedQuality,
                            });
                            quality = askQuality.quality
                        }
                    }

                    let supportedFilename = getSupportedName(searched[vidNum - 1].title);

                    // if you chose mp4/video
                    if (liveContent) {
                        metadata = false;
                        if (askFormat.format === "mp4") return downloadVideoFfmpeg(liveContent, null, ytdl(searched[vidNum - 1].id, { quality: 'highestvideo' }), supportedFilename)
                    } else {
                        if (askFormat.format === "mp4") return downloadVideoFfmpeg(liveContent, ytdl(searched[vidNum - 1].id, { quality: 'highestaudio' }), ytdl(searched[vidNum - 1].id, { quality: 'highestvideo' }), supportedFilename)
                    }
                    // if you chose mp3/audio
                    if (askFormat.format === "mp3") return downloadAudioFfmpeg(liveContent, ytdl(searched[vidNum - 1].id, { quality: 'highestaudio' }), supportedFilename, searched[vidNum - 1].thumbnail.url, searched[vidNum - 1].id)
                }
            });
            return;
        }
        if (option === "link") {
            let link = askYouTube.youtube;
            if (!link.split("/")[2].endsWith("youtu.be")) {
                if (!link.split("/")[2].endsWith("youtube.com")) {
                    return write("Invalid URL")
                }
            }
            if (!link.includes("/shorts/")) {
                link = link.split("&")[0];
            } else {
                link = link.split("?")[0];
            }

            const searched = await getVideo(link).catch(err => {
                // if it failed to get video, log
                return write("Failed to find video")
            });

            if (!searched) return; // this just stops the code below from running if no video was found
            let liveContent = false;

            if (searched.live) liveContent = true;

            let askFormat;
            if (format) askFormat = { format }
            if (!format) askFormat = await prompts({
                type: 'select',
                name: 'format',
                message: 'What Format do you want to download?',
                choices: [
                    { title: 'Video', value: 'mp4' },
                    { title: 'Audio', value: 'mp3' }
                ],
            });

            if (askFormat.format !== "mp3") {
                // ask the quality
                let askQuality;
                let supportedQuality = [];
                let qualitysRan = 0;
                qualitys.forEach(quality => {
                    qualitysRan += 1;
                    if (Number(quality.value) <= searched.adaptiveFormats[0].height) supportedQuality.push(quality);
                });
                if (quality) askQuality = { quality }
                if (!quality) {
                    askQuality = await prompts({
                        type: 'select',
                        name: 'quality',
                        message: 'What Quality do you want to download?',
                        choices: supportedQuality,
                    });
                    quality = askQuality.quality
                }
            }

            let supportedFilename = getSupportedName(searched.title);

            if (liveContent) {
                metadata = false;
                if (askFormat.format === "mp4") return downloadVideoFfmpeg(liveContent, null, ytdl(searched.id, { quality: 'highestvideo' }), supportedFilename);
            } else {
                if (askFormat.format === "mp4") return downloadVideoFfmpeg(liveContent, ytdl(searched.id, { quality: 'highestaudio' }), ytdl(searched.id, { quality: 'highestvideo' }), supportedFilename);
            }
            if (askFormat.format === "mp3") return downloadAudioFfmpeg(liveContent, ytdl(searched.id, { quality: 'highestaudio' }), supportedFilename, searched.thumbnail.url, searched.id);
            return;
        }
    }

    if (enableWeb) {
        app.listen(webPort, () => { online = true });
    }
}
