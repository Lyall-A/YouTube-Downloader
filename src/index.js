// setting up variables
const ytdl = require('ytdl-core');
const { search } = require('youtube-sr').default;
const { getVideo } = require('youtube-sr').default;
const chalk = require('chalk');
const ffmpeg = require('fluent-ffmpeg');
const prompts = require('prompts');
const { resolve } = require('path');
const fs = require('fs');
const downloads = `${resolve(__dirname, '..')}\\YouTube Downloader`;
let searchLimit = 10; // change this if you want to search for more or less results
let debug = false; // change this to true if you wnat debug mode, deleting that file also enables this
const presets = require(`${resolve(__dirname, '..')}\\presets.json`);
let presetUse = false;
ffmpeg.setFfmpegPath(`${resolve(__dirname, '..')}\\FFmpeg\\ffmpeg.exe`);
ffmpeg.setFfprobePath(`${resolve(__dirname, '..')}\\FFmpeg\\ffprobe.exe`);
let presetOption = {
}
/* optionBypass example
query can be a link or a search
format can be mp4, mp3 or both
previouslyDownloaded is y or n 

all is optional

let optionBypass = {
    query: "https://www.youtube.com/watch?v=HRW9W7ZtOEI",
    format: "mp4",
    previouslyDownloaded: "y"
};

*/
let quality;
let optionBypass = {

};

(async () => {
    // check if the file exists, if not then debug mode will be enabled
    if (!fs.existsSync(resolve(__dirname, '..') + "\\Delete this if you know what your doing")) debug = true;

    // if debug mode is on it runs this
    if (debug === true) {
        let old = { mkdirSync: fs.mkdirSync }
        console.log(chalk.red("DEBUG MODE IS ENABLED"))
        fs.mkdirSync = function (dir) {
            console.log(`Creating directory ${dir}`)
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
                    presetUse = true;
                    presetOption = presets[preset].config
                }
            }
        };
    }

    if (presetOption.videos) searchLimit = presetOption.videos
    if (presetOption.quality) quality = presetOption.quality
    if (presetOption.overwrite) optionBypass.previouslyDownloaded = "y"
    if (presetOption.format) optionBypass.format = presetOption.format

    // asking for the link or query
    let askYouTube;
    if (optionBypass.query) askYouTube = { youtube: optionBypass.query }
    if (!optionBypass.query) {
        askYouTube = await prompts({
            type: 'text',
            name: 'youtube',
            message: 'Enter YouTube link or Search Query',
            validate: response => response === "" ? "You must enter a YouTube link or a Search Query" : true
        });
    }


    // detect if answer is link or query
    if (askYouTube.youtube.startsWith('http')) { launch("link") } else { launch("search") }

    // launch the downloader
    async function launch(option) {
        // if it detected a search and not a link
        if (option === "search") {
            // get video details using youtube api
            const searched = await search(askYouTube.youtube, { limit: searchLimit });
            if (!searched[0]) {
                return console.log(chalk.red("No results where found"))
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
                    console.log("\n" + searchArray.join('\n') + "\n")
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
                if (optionBypass.format) askFormat = { format: optionBypass.format }
                if (!optionBypass.format) {
                    askFormat = await prompts({
                        type: 'select',
                        name: 'format',
                        message: 'What Format do you want to download?',
                        choices: [
                            { title: 'Audio', value: 'mp3' },
                            { title: 'Video', value: 'mp4' },
                            { title: 'Both', value: 'both' }
                        ],
                    });
                }

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

                // a lot of code just to make sure that the file wont fail due to a character in the title that windows doesnt like
                let supportedFileName = rawSearchArray[vidNum - 1];
                supportedFileName = supportedFileName.replaceAll("\\", "");
                supportedFileName = supportedFileName.replaceAll("/", "");
                supportedFileName = supportedFileName.replaceAll(":", "");
                supportedFileName = supportedFileName.replaceAll("*", "");
                supportedFileName = supportedFileName.replaceAll("?", "");
                supportedFileName = supportedFileName.replaceAll("\"", "");
                supportedFileName = supportedFileName.replaceAll("<", "");
                supportedFileName = supportedFileName.replaceAll(">", "");
                supportedFileName = supportedFileName.replaceAll("|", "");

                // if you chose mp4/video
                if (askFormat.format === "mp4") {
                    // checks if video has already been downloaded
                    if (fs.existsSync(`${downloads}\\Videos\\${supportedFileName}.mp4`)) {
                        // asks if you want to overwrite
                        let askOverwrite;
                        if (optionBypass.previouslyDownloaded) askOverwrite = { overwrite: optionBypass.previouslyDownloaded }
                        if (!optionBypass.previouslyDownloaded) {
                            askOverwrite = await prompts({
                                type: 'text',
                                name: 'overwrite',
                                message: 'This has previously been downloaded, overwrite? \'Y/N\'',
                                validate: response => response.toLowerCase() === "n" ? true : response.toLowerCase() === "y" ? true : "Invalid option"
                            });
                        }

                        // if no then return
                        if (askOverwrite.overwrite.toLowerCase() === "n") return;
                        // else continue and download mp4

                        // downloading audio
                        // if the video hasnt already been downloaded
                        let audioFfmpeg = ffmpeg(ytdl(idArray[vidNum - 1], { quality: 'highestaudio' }));
                        if (presetOption.audioBitrate) audioFfmpeg.audioBitrate(presetOption.audioBitrate)
                        if (presetOption.volume) audioFfmpeg.addOutputOption('-filter:a', `volume=${presetOption.volume}`)
                        audioFfmpeg.save(`${downloads}\\Videos\\${supportedFileName}.mp3`)
                        audioFfmpeg.on('error', (err) => {
                            // if a error was found downloading audio
                            console.log("An FFmpeg Error Occurred, Sorry!")
                            if (debug) console.log(err)
                            return;
                        });
                        audioFfmpeg.on('end', () => {
                            // if the audio download finished

                            // downloading video
                            let videoFfmpeg = ffmpeg(ytdl(idArray[vidNum - 1], { quality: 'highestvideo' }));
                            videoFfmpeg.addInput(`${downloads}\\Videos\\${supportedFileName}.mp3`)
                            if (presetOption.framerate) videoFfmpeg.fpsOutput(presetOption.framerate)
                            if (presetOption.videoBitrate) videoFfmpeg.videoBitrate(presetOption.videoBitrate)
                            videoFfmpeg.size(`?x${quality}`).save(`${downloads}\\Videos\\${supportedFileName}.mp4`) // this adds the audio that was downloaded earlier to the mp4
                            videoFfmpeg.on('error', (err) => {
                                // if a error was found downloading video
                                console.log("An FFmpeg Error Occurred, Sorry!")
                                if (debug) console.log(err)
                                return;
                            })
                            videoFfmpeg.on('end', () => {
                                // if the video download finished
                                unlink()
                                function unlink() {
                                    fs.unlink(`${downloads}\\Videos\\${supportedFileName}.mp3`, (err) => {
                                        if (err) unlink()
                                    });
                                }
                                return console.log("Succesfully completed video download!")
                            });
                        });
                    } else {
                        // if the video hasnt already been downloaded
                        let audioFfmpeg = ffmpeg(ytdl(idArray[vidNum - 1], { quality: 'highestaudio' }));
                        if (presetOption.audioBitrate) audioFfmpeg.audioBitrate(presetOption.audioBitrate)
                        if (presetOption.volume) audioFfmpeg.addOutputOption('-filter:a', `volume=${presetOption.volume}`)
                        audioFfmpeg.save(`${downloads}\\Videos\\${supportedFileName}.mp3`)
                        audioFfmpeg.on('error', (err) => {
                            // if a error was found downloading audio
                            console.log("An FFmpeg Error Occurred, Sorry!")
                            if (debug) console.log(err)
                            return;
                        });
                        audioFfmpeg.on('end', () => {
                            // if the audio download finished

                            // downloading video
                            let videoFfmpeg = ffmpeg(ytdl(idArray[vidNum - 1], { quality: 'highestvideo' }));
                            videoFfmpeg.addInput(`${downloads}\\Videos\\${supportedFileName}.mp3`)
                            if (presetOption.framerate) videoFfmpeg.fpsOutput(presetOption.framerate)
                            if (presetOption.videoBitrate) videoFfmpeg.videoBitrate(presetOption.videoBitrate)
                            videoFfmpeg.size(`?x${quality}`).save(`${downloads}\\Videos\\${supportedFileName}.mp4`) // this adds the audio that was downloaded earlier to the mp4
                            videoFfmpeg.on('error', (err) => {
                                // if a error was found downloading video
                                console.log("An FFmpeg Error Occurred, Sorry!")
                                if (debug) console.log(err)
                                return;
                            })
                            videoFfmpeg.on('end', () => {
                                // if the video download finished
                                unlink()
                                function unlink() {
                                    fs.unlink(`${downloads}\\Videos\\${supportedFileName}.mp3`, (err) => {
                                        if (err) unlink()
                                    });
                                }
                                return console.log("Succesfully completed video download!")
                            });
                        });
                    }
                }
                // if you chose mp3/audio
                if (askFormat.format === "mp3") {
                    // checks if audio has been downloaded before
                    if (fs.existsSync(`${downloads}\\Audios\\${supportedFileName}.mp3`)) {
                        // asks if you want to overwrite previous audio file
                        let askOverwrite;
                        if (optionBypass.previouslyDownloaded) askOverwrite = { overwrite: optionBypass.previouslyDownloaded }
                        if (!optionBypass.previouslyDownloaded) {
                            askOverwrite = await prompts({
                                type: 'text',
                                name: 'overwrite',
                                message: 'This has previously been downloaded, overwrite? \'Y/N\'',
                                validate: response => response.toLowerCase() === "n" ? true : response.toLowerCase() === "y" ? true : "Invalid option"
                            });
                        }

                        // if no then return
                        if (askOverwrite.overwrite.toLowerCase() === "n") return;
                        // else download

                        let audioFfmpeg = ffmpeg(ytdl(idArray[vidNum - 1], { quality: 'highestaudio' }))
                        if (presetOption.audioBitrate) audioFfmpeg.audioBitrate(presetOption.audioBitrate)
                        if (presetOption.volume) audioFfmpeg.addOutputOption('-filter:a', `volume=${presetOption.volume}`)
                        audioFfmpeg.save(`${downloads}\\Audios\\${supportedFileName}.mp3`)
                        audioFfmpeg.on('error', (err) => {
                            // if an error was found
                            console.log("An FFmpeg Error Occurred, Sorry!")
                            if (debug) console.log(err)
                            return;
                        })
                        audioFfmpeg.on('end', () => {
                            // if audio finished downloading
                            return console.log("Succesfully completed audio download!")
                        });
                    } else {
                        // if audio hasnt already been downloaded
                        let audioFfmpeg = ffmpeg(ytdl(idArray[vidNum - 1], { quality: 'highestaudio' }))
                        if (presetOption.audioBitrate) audioFfmpeg.audioBitrate(presetOption.audioBitrate)
                        if (presetOption.volume) audioFfmpeg.addOutputOption('-filter:a', `volume=${presetOption.volume}`)
                        audioFfmpeg.save(`${downloads}\\Audios\\${supportedFileName}.mp3`)
                        audioFfmpeg.on('error', (err) => {
                            // if an error was found
                            console.log("An FFmpeg Error Occurred, Sorry!")
                            if (debug) console.log(err)
                            return;
                        })
                        audioFfmpeg.on('end', () => {
                            // if audio finished downloading
                            return console.log("Succesfully completed audio download!")
                        });
                    }
                }
                // if you chose both
                if (askFormat.format === "both") {
                    // this is A LOTT of code
                    if (fs.existsSync(`${downloads}\\Videos\\${supportedFileName}.mp4`)) {
                        let askOverwrite;
                        if (optionBypass.previouslyDownloaded) askOverwrite = { overwrite: optionBypass.previouslyDownloaded }
                        if (!optionBypass.previouslyDownloaded) {
                            askOverwrite = await prompts({
                                type: 'text',
                                name: 'overwrite',
                                message: 'This has previously been downloaded, overwrite? \'Y/N\'',
                                validate: response => response.toLowerCase() === "n" ? true : response.toLowerCase() === "y" ? true : "Invalid option"
                            });
                        }


                        if (askOverwrite.overwrite.toLowerCase() === "n") return;
                        if (fs.existsSync(`${downloads}\\Audios\\${supportedFileName}.mp3`)) {
                            let askOverwrite;
                            if (optionBypass.previouslyDownloaded) askOverwrite = { overwrite: optionBypass.previouslyDownloaded }
                            if (!optionBypass.previouslyDownloaded) {
                                askOverwrite = await prompts({
                                    type: 'text',
                                    name: 'overwrite',
                                    message: 'This has previously been downloaded, overwrite? \'Y/N\'',
                                    validate: response => response.toLowerCase() === "n" ? true : response.toLowerCase() === "y" ? true : "Invalid option"
                                });
                            }


                            if (askOverwrite.overwrite.toLowerCase() === "n") return;
                            let audioFfmpeg = ffmpeg(ytdl(idArray[vidNum - 1], { quality: 'highestaudio' }))
                            if (presetOption.audioBitrate) audioFfmpeg.audioBitrate(presetOption.audioBitrate)
                            if (presetOption.volume) audioFfmpeg.addOutputOption('-filter:a', `volume=${presetOption.volume}`)
                            audioFfmpeg.save(`${downloads}\\Audios\\${supportedFileName}.mp3`)
                            audioFfmpeg.on('error', (err) => {
                                console.log("An FFmpeg Error Occurred, Sorry!")
                                if (debug) console.log(err)
                                return;
                            })
                            audioFfmpeg.on('end', () => {
                                let videoFfmpeg = ffmpeg(ytdl(idArray[vidNum - 1], { quality: 'highestvideo' }));
                                videoFfmpeg.addInput(`${downloads}\\Audios\\${supportedFileName}.mp3`)
                                if (presetOption.framerate) videoFfmpeg.fpsOutput(presetOption.framerate)
                                if (presetOption.videoBitrate) videoFfmpeg.videoBitrate(presetOption.videoBitrate)
                                videoFfmpeg.size(`?x${quality}`).save(`${downloads}\\Videos\\${supportedFileName}.mp4`) // this adds the audio that was downloaded earlier to the mp4
                                videoFfmpeg.on('error', (err) => {
                                    // if a error was found downloading video
                                    console.log("An FFmpeg Error Occurred, Sorry!")
                                    if (debug) console.log(err)
                                    return;
                                })
                                videoFfmpeg.on('end', () => {
                                    return console.log("Succesfully completed video and audio download!")
                                });
                            });
                        } else {
                            let audioFfmpeg = ffmpeg(ytdl(idArray[vidNum - 1], { quality: 'highestaudio' }))
                            if (presetOption.audioBitrate) audioFfmpeg.audioBitrate(presetOption.audioBitrate)
                            if (presetOption.volume) audioFfmpeg.addOutputOption('-filter:a', `volume=${presetOption.volume}`)
                            audioFfmpeg.save(`${downloads}\\Audios\\${supportedFileName}.mp3`)
                            audioFfmpeg.on('error', (err) => {
                                console.log("An FFmpeg Error Occurred, Sorry!")
                                if (debug) console.log(err)
                                return;
                            })
                            audioFfmpeg.on('end', () => {
                                let videoFfmpeg = ffmpeg(ytdl(idArray[vidNum - 1], { quality: 'highestvideo' }));
                                videoFfmpeg.addInput(`${downloads}\\Audios\\${supportedFileName}.mp3`)
                                if (presetOption.framerate) videoFfmpeg.fpsOutput(presetOption.framerate)
                                if (presetOption.videoBitrate) videoFfmpeg.videoBitrate(presetOption.videoBitrate)
                                videoFfmpeg.size(`?x${quality}`).save(`${downloads}\\Videos\\${supportedFileName}.mp4`) // this adds the audio that was downloaded earlier to the mp4
                                videoFfmpeg.on('error', (err) => {
                                    // if a error was found downloading video
                                    console.log("An FFmpeg Error Occurred, Sorry!")
                                    if (debug) console.log(err)
                                    return;
                                })
                                videoFfmpeg.on('end', () => {
                                    return console.log("Succesfully completed video and audio download!")
                                });
                            });
                        }

                    } else {
                        if (fs.existsSync(`${downloads}\\Audios\\${supportedFileName}.mp3`)) {
                            let askOverwrite;

                            if (optionBypass.previouslyDownloaded) askOverwrite = { overwrite: optionBypass.previouslyDownloaded }
                            if (!optionBypass.previouslyDownloaded) {
                                askOverwrite = await prompts({
                                    type: 'text',
                                    name: 'overwrite',
                                    message: 'This has previously been downloaded, overwrite? \'Y/N\'',
                                    validate: response => response.toLowerCase() === "n" ? true : response.toLowerCase() === "y" ? true : "Invalid option"
                                });
                            }


                            if (askOverwrite.overwrite.toLowerCase() === "n") return;
                            let audioFfmpeg = ffmpeg(ytdl(idArray[vidNum - 1], { quality: 'highestaudio' }))
                            if (presetOption.audioBitrate) audioFfmpeg.audioBitrate(presetOption.audioBitrate)
                            if (presetOption.volume) audioFfmpeg.addOutputOption('-filter:a', `volume=${presetOption.volume}`)
                            audioFfmpeg.save(`${downloads}\\Audios\\${supportedFileName}.mp3`)
                            audioFfmpeg.on('error', (err) => {
                                console.log("An FFmpeg Error Occurred, Sorry!")
                                if (debug) console.log(err)
                                return;
                            })
                            audioFfmpeg.on('end', () => {
                                let videoFfmpeg = ffmpeg(ytdl(idArray[vidNum - 1], { quality: 'highestvideo' }));
                                videoFfmpeg.addInput(`${downloads}\\Audios\\${supportedFileName}.mp3`)
                                if (presetOption.framerate) videoFfmpeg.fpsOutput(presetOption.framerate)
                                if (presetOption.videoBitrate) videoFfmpeg.videoBitrate(presetOption.videoBitrate)
                                videoFfmpeg.size(`?x${quality}`).save(`${downloads}\\Videos\\${supportedFileName}.mp4`) // this adds the audio that was downloaded earlier to the mp4
                                videoFfmpeg.on('error', (err) => {
                                    // if a error was found downloading video
                                    console.log("An FFmpeg Error Occurred, Sorry!")
                                    if (debug) console.log(err)
                                    return;
                                })
                                videoFfmpeg.on('end', () => {
                                    return console.log("Succesfully completed video and audio download!")
                                });
                            });
                        } else {
                            let audioFfmpeg = ffmpeg(ytdl(idArray[vidNum - 1], { quality: 'highestaudio' }))
                            if (presetOption.audioBitrate) audioFfmpeg.audioBitrate(presetOption.audioBitrate)
                            if (presetOption.volume) audioFfmpeg.addOutputOption('-filter:a', `volume=${presetOption.volume}`)
                            audioFfmpeg.save(`${downloads}\\Audios\\${supportedFileName}.mp3`)
                            audioFfmpeg.on('error', (err) => {
                                console.log("An FFmpeg Error Occurred, Sorry!")
                                if (debug) console.log(err)
                                return;
                            })
                            audioFfmpeg.on('end', () => {
                                let videoFfmpeg = ffmpeg(ytdl(idArray[vidNum - 1], { quality: 'highestvideo' }));
                                videoFfmpeg.addInput(`${downloads}\\Audios\\${supportedFileName}.mp3`)
                                if (presetOption.framerate) videoFfmpeg.fpsOutput(presetOption.framerate)
                                if (presetOption.videoBitrate) videoFfmpeg.videoBitrate(presetOption.videoBitrate)
                                videoFfmpeg.size(`?x${quality}`).save(`${downloads}\\Videos\\${supportedFileName}.mp4`) // this adds the audio that was downloaded earlier to the mp4
                                videoFfmpeg.on('error', (err) => {
                                    // if a error was found downloading video
                                    console.log("An FFmpeg Error Occurred, Sorry!")
                                    if (debug) console.log(err)
                                    return;
                                })
                                videoFfmpeg.on('end', () => {
                                    return console.log("Succesfully completed video and audio download!")
                                });
                            });
                        }
                    }
                }

            }
            return;
        }
        if (option === "link") {
            let link = askYouTube.youtube;
            if (!link.split("/")[2].endsWith("youtu.be")) {
                if (!link.split("/")[2].endsWith("youtube.com")) {
                    return console.log("Invalid URL")
                }
            }

            let askFormat;

            if (optionBypass.format) askFormat = { format: optionBypass.format }
            if (!optionBypass.format) {
                askFormat = await prompts({
                    type: 'select',
                    name: 'format',
                    message: 'What Format do you want to download?',
                    choices: [
                        { title: 'Audio', value: 'mp3' },
                        { title: 'Video', value: 'mp4' },
                        { title: 'Both', value: 'both' }
                    ],
                });
            }



            const searched = await getVideo(link).catch(err => {
                // if it failed to get video, log
                return console.log("Failed to find video")
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


            let supportedFileName = searched.title;
            supportedFileName = supportedFileName.replaceAll("\\", "");
            supportedFileName = supportedFileName.replaceAll("/", "");
            supportedFileName = supportedFileName.replaceAll(":", "");
            supportedFileName = supportedFileName.replaceAll("*", "");
            supportedFileName = supportedFileName.replaceAll("?", "");
            supportedFileName = supportedFileName.replaceAll("\"", "");
            supportedFileName = supportedFileName.replaceAll("<", "");
            supportedFileName = supportedFileName.replaceAll(">", "");
            supportedFileName = supportedFileName.replaceAll("|", "");

            if (askFormat.format === "mp4") {
                if (fs.existsSync(`${downloads}\\Videos\\${supportedFileName}.mp4`)) {
                    let askOverwrite;

                    if (optionBypass.previouslyDownloaded) askOverwrite = { overwrite: optionBypass.previouslyDownloaded }
                    if (!optionBypass.previouslyDownloaded) {
                        askOverwrite = await prompts({
                            type: 'text',
                            name: 'overwrite',
                            message: 'This has previously been downloaded, overwrite? \'Y/N\'',
                            validate: response => response.toLowerCase() === "n" ? true : response.toLowerCase() === "y" ? true : "Invalid option"
                        });
                    }


                    if (askOverwrite.overwrite.toLowerCase() === "n") return;
                    let audioFfmpeg = ffmpeg(ytdl(searched.id, { quality: 'highestaudio' }))
                    if (presetOption.audioBitrate) audioFfmpeg.audioBitrate(presetOption.audioBitrate)
                    if (presetOption.volume) audioFfmpeg.addOutputOption('-filter:a', `volume=${presetOption.volume}`)
                    audioFfmpeg.save(`${downloads}\\Videos\\${supportedFileName}.mp3`)
                    audioFfmpeg.on('error', (err) => {
                        // if a error was found downloading audio
                        console.log("An FFmpeg Error Occurred, Sorry!")
                        if (debug) console.log(err)
                        return;
                    });
                    audioFfmpeg.on('end', () => {
                        let videoFfmpeg = ffmpeg(ytdl(searched.id, { quality: 'highestvideo' }))
                            .addInput(`${downloads}\\Videos\\${supportedFileName}.mp3`)
                            .size(`?x${quality}`)
                            .save(`${downloads}\\Videos\\${supportedFileName}.mp4`)
                            .on('error', (err) => {
                                console.log("An FFmpeg Error Occurred, Sorry!")
                                if (debug) console.log(err)
                                return;
                            })
                            .on('end', () => {
                                unlink()
                                function unlink() {
                                    fs.unlink(`${downloads}\\Videos\\${supportedFileName}.mp3`, (err) => {
                                        if (err) unlink()
                                    });
                                }
                                return console.log("Succesfully completed video download!")
                            });
                        if (presetOption.framerate) videoFfmpeg.addOutputOption(`-filter:v fps=${presetOption.framerate}`)
                    });
                } else {
                    let audioFfmpeg = ffmpeg(ytdl(searched.id, { quality: 'highestaudio' }))
                    if (presetOption.audioBitrate) audioFfmpeg.audioBitrate(presetOption.audioBitrate)
                    if (presetOption.volume) audioFfmpeg.addOutputOption('-filter:a', `volume=${presetOption.volume}`)
                    audioFfmpeg.save(`${downloads}\\Videos\\${supportedFileName}.mp3`)
                    audioFfmpeg.on('error', (err) => {
                        // if a error was found downloading audio
                        console.log("An FFmpeg Error Occurred, Sorry!")
                        if (debug) console.log(err)
                        return;
                    });
                    audioFfmpeg.on('end', () => {
                        let videoFfmpeg = ffmpeg(ytdl(searched.id, { quality: 'highestvideo' }))
                            .addInput(`${downloads}\\Videos\\${supportedFileName}.mp3`)
                            .size(`?x${quality}`)
                            .save(`${downloads}\\Videos\\${supportedFileName}.mp4`)
                            .on('error', (err) => {
                                console.log("An FFmpeg Error Occurred, Sorry!")
                                if (debug) console.log(err)
                                return;
                            })
                            .on('end', () => {
                                unlink()
                                function unlink() {
                                    fs.unlink(`${downloads}\\Videos\\${supportedFileName}.mp3`, (err) => {
                                        if (err) unlink()
                                    });
                                }
                                return console.log("Succesfully completed video download!")
                            });
                    });
                }
            }
            if (askFormat.format === "mp3") {
                if (fs.existsSync(`${downloads}\\Audios\\${supportedFileName}.mp3`)) {
                    let askOverwrite;

                    if (optionBypass.previouslyDownloaded) askOverwrite = { overwrite: optionBypass.previouslyDownloaded }
                    if (!optionBypass.previouslyDownloaded) {
                        askOverwrite = await prompts({
                            type: 'text',
                            name: 'overwrite',
                            message: 'This has previously been downloaded, overwrite? \'Y/N\'',
                            validate: response => response.toLowerCase() === "n" ? true : response.toLowerCase() === "y" ? true : "Invalid option"
                        });

                    }

                    if (askOverwrite.overwrite.toLowerCase() === "n") return;
                    let audioFfmpeg = ffmpeg(ytdl(searched.id, { quality: 'highestaudio' }))
                    if (presetOption.audioBitrate) audioFfmpeg.audioBitrate(presetOption.audioBitrate)
                    if (presetOption.volume) audioFfmpeg.addOutputOption('-filter:a', `volume=${presetOption.volume}`)
                    audioFfmpeg.save(`${downloads}\\Audios\\${supportedFileName}.mp3`)
                    audioFfmpeg.on('error', (err) => {
                        // if a error was found downloading audio
                        console.log("An FFmpeg Error Occurred, Sorry!")
                        if (debug) console.log(err)
                        return;
                    });
                    audioFfmpeg.on('end', () => {
                        console.log("Succesfully completed audio download!")
                    });
                } else {
                    let audioFfmpeg = ffmpeg(ytdl(searched.id, { quality: 'highestaudio' }))
                    if (presetOption.audioBitrate) audioFfmpeg.audioBitrate(presetOption.audioBitrate)
                    if (presetOption.volume) audioFfmpeg.addOutputOption('-filter:a', `volume=${presetOption.volume}`)
                    audioFfmpeg.save(`${downloads}\\Audios\\${supportedFileName}.mp3`)
                    audioFfmpeg.on('error', (err) => {
                        // if a error was found downloading audio
                        console.log("An FFmpeg Error Occurred, Sorry!")
                        if (debug) console.log(err)
                        return;
                    });
                    audioFfmpeg.on('end', () => {
                        console.log("Succesfully completed audio download!")
                    });
                }
            }
            if (askFormat.format === "both") {
                if (fs.existsSync(`${downloads}\\Videos\\${supportedFileName}.mp4`)) {
                    let askOverwrite;

                    if (optionBypass.previouslyDownloaded) askOverwrite = { overwrite: optionBypass.previouslyDownloaded }
                    if (!optionBypass.previouslyDownloaded) {
                        askOverwrite = await prompts({
                            type: 'text',
                            name: 'overwrite',
                            message: 'This has previously been downloaded, overwrite? \'Y/N\'',
                            validate: response => response.toLowerCase() === "n" ? true : response.toLowerCase() === "y" ? true : "Invalid option"
                        });
                    }


                    if (askOverwrite.overwrite.toLowerCase() === "n") return;
                    if (fs.existsSync(`${downloads}\\Audios\\${supportedFileName}.mp3`)) {
                        let askOverwrite;

                        if (optionBypass.previouslyDownloaded) askOverwrite = { overwrite: optionBypass.previouslyDownloaded }
                        if (!optionBypass.previouslyDownloaded) {
                            askOverwrite = await prompts({
                                type: 'text',
                                name: 'overwrite',
                                message: 'This has previously been downloaded, overwrite? \'Y/N\'',
                                validate: response => response.toLowerCase() === "n" ? true : response.toLowerCase() === "y" ? true : "Invalid option"
                            });
                        }

                        if (askOverwrite.overwrite.toLowerCase() === "n") return;
                        let audioFfmpeg = ffmpeg(ytdl(searched.id, { quality: 'highestaudio' }))
                        if (presetOption.audioBitrate) audioFfmpeg.audioBitrate(presetOption.audioBitrate)
                        if (presetOption.volume) audioFfmpeg.addOutputOption('-filter:a', `volume=${presetOption.volume}`)
                        audioFfmpeg.save(`${downloads}\\Audios\\${supportedFileName}.mp3`)
                        audioFfmpeg.on('error', (err) => {
                            console.log("An FFmpeg Error Occurred, Sorry!")
                            if (debug) console.log(err)
                            return;
                        })
                        audioFfmpeg.on('end', () => {
                            let videoFfmpeg = ffmpeg(ytdl(searched.id, { quality: 'highestvideo' }));
                            videoFfmpeg.addInput(`${downloads}\\Audios\\${supportedFileName}.mp3`)
                            if (presetOption.framerate) videoFfmpeg.fpsOutput(presetOption.framerate)
                            if (presetOption.videoBitrate) videoFfmpeg.videoBitrate(presetOption.videoBitrate)
                            videoFfmpeg.size(`?x${quality}`).save(`${downloads}\\Videos\\${supportedFileName}.mp4`) // this adds the audio that was downloaded earlier to the mp4
                            videoFfmpeg.on('error', (err) => {
                                // if a error was found downloading video
                                console.log("An FFmpeg Error Occurred, Sorry!")
                                if (debug) console.log(err)
                                return;
                            })
                            videoFfmpeg.on('end', () => {
                                return console.log("Succesfully completed video and audio download!")
                            });
                        });
                    } else {
                        let audioFfmpeg = ffmpeg(ytdl(searched.id, { quality: 'highestaudio' }))
                        if (presetOption.audioBitrate) audioFfmpeg.audioBitrate(presetOption.audioBitrate)
                        if (presetOption.volume) audioFfmpeg.addOutputOption('-filter:a', `volume=${presetOption.volume}`)
                        audioFfmpeg.save(`${downloads}\\Audios\\${supportedFileName}.mp3`)
                        audioFfmpeg.on('error', (err) => {
                            console.log("An FFmpeg Error Occurred, Sorry!")
                            if (debug) console.log(err)
                            return;
                        })
                        audioFfmpeg.on('end', () => {
                            let videoFfmpeg = ffmpeg(ytdl(searched.id, { quality: 'highestvideo' }));
                            videoFfmpeg.addInput(`${downloads}\\Audios\\${supportedFileName}.mp3`)
                            if (presetOption.framerate) videoFfmpeg.fpsOutput(presetOption.framerate)
                            if (presetOption.videoBitrate) videoFfmpeg.videoBitrate(presetOption.videoBitrate)
                            videoFfmpeg.size(`?x${quality}`).save(`${downloads}\\Videos\\${supportedFileName}.mp4`) // this adds the audio that was downloaded earlier to the mp4
                            videoFfmpeg.on('error', (err) => {
                                // if a error was found downloading video
                                console.log("An FFmpeg Error Occurred, Sorry!")
                                if (debug) console.log(err)
                                return;
                            })
                            videoFfmpeg.on('end', () => {
                                return console.log("Succesfully completed video and audio download!")
                            });
                        });
                    }

                } else {
                    if (fs.existsSync(`${downloads}\\Audios\\${supportedFileName}.mp3`)) {
                        let askOverwrite;

                        if (optionBypass.previouslyDownloaded) askOverwrite = { overwrite: optionBypass.previouslyDownloaded }
                        if (!optionBypass.previouslyDownloaded) {
                            askOverwrite = await prompts({
                                type: 'text',
                                name: 'overwrite',
                                message: 'This has previously been downloaded, overwrite? \'Y/N\'',
                                validate: response => response.toLowerCase() === "n" ? true : response.toLowerCase() === "y" ? true : "Invalid option"
                            });
                        }


                        if (askOverwrite.overwrite.toLowerCase() === "n") return;
                        let audioFfmpeg = ffmpeg(ytdl(searched.id, { quality: 'highestaudio' }))
                        if (presetOption.audioBitrate) audioFfmpeg.audioBitrate(presetOption.audioBitrate)
                        if (presetOption.volume) audioFfmpeg.addOutputOption('-filter:a', `volume=${presetOption.volume}`)
                        audioFfmpeg.save(`${downloads}\\Audios\\${supportedFileName}.mp3`)
                        audioFfmpeg.on('error', (err) => {
                            console.log("An FFmpeg Error Occurred, Sorry!")
                            if (debug) console.log(err)
                            return;
                        })
                        audioFfmpeg.on('end', () => {
                            let videoFfmpeg = ffmpeg(ytdl(searched.id, { quality: 'highestvideo' }));
                            videoFfmpeg.addInput(`${downloads}\\Audios\\${supportedFileName}.mp3`)
                            if (presetOption.framerate) videoFfmpeg.fpsOutput(presetOption.framerate)
                            if (presetOption.videoBitrate) videoFfmpeg.videoBitrate(presetOption.videoBitrate)
                            videoFfmpeg.size(`?x${quality}`).save(`${downloads}\\Videos\\${supportedFileName}.mp4`) // this adds the audio that was downloaded earlier to the mp4
                            videoFfmpeg.on('error', (err) => {
                                // if a error was found downloading video
                                console.log("An FFmpeg Error Occurred, Sorry!")
                                if (debug) console.log(err)
                                return;
                            })
                            videoFfmpeg.on('end', () => {
                                return console.log("Succesfully completed video and audio download!")
                            });
                        });
                    } else {
                        let audioFfmpeg = ffmpeg(ytdl(searched.id, { quality: 'highestaudio' }))
                        if (presetOption.audioBitrate) audioFfmpeg.audioBitrate(presetOption.audioBitrate)
                        if (presetOption.volume) audioFfmpeg.addOutputOption('-filter:a', `volume=${presetOption.volume}`)
                        audioFfmpeg.save(`${downloads}\\Audios\\${supportedFileName}.mp3`)
                        audioFfmpeg.on('error', (err) => {
                            console.log("An FFmpeg Error Occurred, Sorry!")
                            if (debug) console.log(err)
                            return;
                        })
                        audioFfmpeg.on('end', () => {
                            let videoFfmpeg = ffmpeg(ytdl(searched.id, { quality: 'highestvideo' }));
                            videoFfmpeg.addInput(`${downloads}\\Audios\\${supportedFileName}.mp3`)
                            if (presetOption.framerate) videoFfmpeg.fpsOutput(presetOption.framerate)
                            if (presetOption.videoBitrate) videoFfmpeg.videoBitrate(presetOption.videoBitrate)
                            videoFfmpeg.size(`?x${quality}`).save(`${downloads}\\Videos\\${supportedFileName}.mp4`) // this adds the audio that was downloaded earlier to the mp4
                            videoFfmpeg.on('error', (err) => {
                                // if a error was found downloading video
                                console.log("An FFmpeg Error Occurred, Sorry!")
                                if (debug) console.log(err)
                                return;
                            })
                            videoFfmpeg.on('end', () => {
                                return console.log("Succesfully completed video and audio download!")
                            });
                        });
                    }
                }
            }
            return;
        }
    }
})();