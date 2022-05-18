const ytdl = require('ytdl-core');
const { search } = require('youtube-sr').default;
const { getVideo } = require('youtube-sr').default;
const chalk = require('chalk');
const ffmpeg = require('fluent-ffmpeg');
const prompts = require('prompts');
const { resolve } = require('path');
const fs = require('fs');
const downloads = `${resolve(__dirname, '..')}\\YouTube Downloader`;
let searchLimit = 20;
let debug = false;

(async () => {
    if (!fs.existsSync(resolve(__dirname, '..') + "\\Delete this if you know what your doing")) debug = true;
    if (debug === true) {
        let old = { mkdirSync: fs.mkdirSync }
        console.log(chalk.red("DEBUG MODE IS ENABLED"))
        fs.mkdirSync = function (dir) {
            console.log(`Creating directory ${dir}`)
            old.mkdirSync(dir);
        }
    }

    if (!fs.existsSync(downloads)) fs.mkdirSync(downloads);
    if (!fs.existsSync(`${downloads}\\Videos`)) fs.mkdirSync(`${downloads}\\Videos`);
    if (!fs.existsSync(`${downloads}\\Audios`)) fs.mkdirSync(`${downloads}\\Audios`);

    const askYouTube = await prompts({
        type: 'text',
        name: 'youtube',
        message: 'Enter YouTube link or Search Query',
        validate: response => response === "" ? "You must enter a YouTube link or a Search Query" : true
    });

    if (askYouTube.youtube.startsWith('http')) { launch("link") } else { launch("search") }

    async function launch(option) {
        if (option === "search") {
            const searched = await search(askYouTube.youtube, { limit: searchLimit });
            if (!searched[0]) {
                return console.log(chalk.red("No results where found"))
            }
            let query = 0;
            let foundAll = false;
            let searchArray = [];
            let idArray = [];
            let rawSearchArray = [];
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
                if (!foundAll) searchContinue()
            }, 5000)
            async function searchContinue() {
                console.log("\n" + searchArray.join('\n') + "\n")
                const askVid = await prompts({
                    type: 'number',
                    name: 'vid',
                    message: 'What one do you want?',
                    validate: response => !response ? "You must enter the YouTube Video number shown above" : response > query ? "Unknown Video" : response < 1 ? "Cannot be under 1" : true
                });

                const askFormat = await prompts({
                    type: 'select',
                    name: 'format',
                    message: 'What Format do you want to download?',
                    choices: [
                        { title: 'Audio', value: 'mp3' },
                        { title: 'Video', value: 'mp4' },
                        { title: 'Both', value: 'both' }
                    ],
                });

                let supportedFileName = rawSearchArray[askVid.vid - 1];
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
                        const askOverwrite = await prompts({
                            type: 'text',
                            name: 'overwrite',
                            message: 'This has previously been downloaded, overwrite? \'Y/N\'',
                            validate: response => response.toLowerCase() === "n" ? true : response.toLowerCase() === "y" ? true : "Invalid option"
                        });

                        if (askOverwrite.overwrite === "n") return;
                        ffmpeg(ytdl(idArray[askVid.vid - 1], { quality: 'highestaudio' }))
                            .save(`${downloads}\\Videos\\${supportedFileName}.mp3`)
                            .on('error', (err) => {
                                console.log("An FFmpeg Error Occurred, Sorry!")
                                if (debug) console.log(err)
                                return;
                            })
                            .on('end', () => {
                                ffmpeg(ytdl(idArray[askVid.vid - 1], { quality: 'highestvideo' }))
                                    .addInput(`${downloads}\\Videos\\${supportedFileName}.mp3`)
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
                    } else {
                        ffmpeg(ytdl(idArray[askVid.vid - 1], { quality: 'highestaudio' }))
                            .save(`${downloads}\\Videos\\${supportedFileName}.mp3`)
                            .on('error', (err) => {
                                console.log("An FFmpeg Error Occurred, Sorry!")
                                if (debug) console.log(err)
                                return;
                            })
                            .on('end', () => {
                                ffmpeg(ytdl(idArray[askVid.vid - 1], { quality: 'highestvideo' }))
                                    .addInput(`${downloads}\\Videos\\${supportedFileName}.mp3`)
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
                        const askOverwrite = await prompts({
                            type: 'text',
                            name: 'overwrite',
                            message: 'This has previously been downloaded, overwrite? \'Y/N\'',
                            validate: response => response.toLowerCase() === "n" ? true : response.toLowerCase() === "y" ? true : "Invalid option"
                        });

                        if (askOverwrite.overwrite === "n") return;
                        ffmpeg(ytdl(idArray[askVid.vid - 1], { quality: 'highestaudio' }))
                            .save(`${downloads}\\Audios\\${supportedFileName}.mp3`)
                            .on('error', (err) => {
                                console.log("An FFmpeg Error Occurred, Sorry!")
                                if (debug) console.log(err)
                                return;
                            })
                            .on('end', () => {
                                return console.log("Succesfully completed audio download!")
                            });
                    } else {
                        ffmpeg(ytdl(idArray[askVid.vid - 1], { quality: 'highestaudio' }))
                            .save(`${downloads}\\Audios\\${supportedFileName}.mp3`)
                            .on('error', (err) => {
                                console.log("An FFmpeg Error Occurred, Sorry!")
                                if (debug) console.log(err)
                                return;
                            })
                            .on('end', () => {
                                return console.log("Succesfully completed audio download!")
                            });
                    }
                }
                if (askFormat.format === "both") {
                    if (fs.existsSync(`${downloads}\\Videos\\${supportedFileName}.mp4`)) {
                        const askOverwrite = await prompts({
                            type: 'text',
                            name: 'overwrite',
                            message: 'This has previously been downloaded as a Video, overwrite? \'Y/N\'',
                            validate: response => response.toLowerCase() === "n" ? true : response.toLowerCase() === "y" ? true : "Invalid option"
                        });

                        if (askOverwrite.overwrite === "n") return;
                        if (fs.existsSync(`${downloads}\\Audios\\${supportedFileName}.mp3`)) {
                            const askOverwrite = await prompts({
                                type: 'text',
                                name: 'overwrite',
                                message: 'This has previously been downloaded as a Audio, overwrite? \'Y/N\'',
                                validate: response => response.toLowerCase() === "n" ? true : response.toLowerCase() === "y" ? true : "Invalid option"
                            });

                            if (askOverwrite.overwrite === "n") return;
                            ffmpeg(ytdl(idArray[askVid.vid - 1], { quality: 'highestaudio' }))
                                .save(`${downloads}\\Audios\\${supportedFileName}.mp3`)
                                .on('error', (err) => {
                                    console.log("An FFmpeg Error Occurred, Sorry!")
                                    if (debug) console.log(err)
                                    return;
                                })
                                .on('end', () => {
                                    ffmpeg(ytdl(idArray[askVid.vid - 1], { quality: 'highestvideo' }))
                                        .addInput(`${downloads}\\Audios\\${supportedFileName}.mp3`)
                                        .save(`${downloads}\\Videos\\${supportedFileName}.mp4`)
                                        .on('error', (err) => {
                                            console.log("An FFmpeg Error Occurred, Sorry!")
                                            if (debug) console.log(err)
                                            return;
                                        })
                                        .on('end', () => {
                                            return console.log("Succesfully completed video amd audio download!")
                                        });
                                });
                        } else {
                            ffmpeg(ytdl(idArray[askVid.vid - 1], { quality: 'highestaudio' }))
                                .save(`${downloads}\\Audios\\${supportedFileName}.mp3`)
                                .on('error', (err) => {
                                    console.log("An FFmpeg Error Occurred, Sorry!")
                                    if (debug) console.log(err)
                                    return;
                                })
                                .on('end', () => {
                                    ffmpeg(ytdl(idArray[askVid.vid - 1], { quality: 'highestvideo' }))
                                        .addInput(`${downloads}\\Audios\\${supportedFileName}.mp3`)
                                        .save(`${downloads}\\Videos\\${supportedFileName}.mp4`)
                                        .on('error', (err) => {
                                            console.log("An FFmpeg Error Occurred, Sorry!")
                                            if (debug) console.log(err)
                                            return;
                                        })
                                        .on('end', () => {
                                            return console.log("Succesfully completed video amd audio download!")
                                        });
                                });
                        }

                    } else {
                        if (fs.existsSync(`${downloads}\\Audios\\${supportedFileName}.mp3`)) {
                            const askOverwrite = await prompts({
                                type: 'text',
                                name: 'overwrite',
                                message: 'This has previously been downloaded as a Audio, overwrite? \'Y/N\'',
                                validate: response => response.toLowerCase() === "n" ? true : response.toLowerCase() === "y" ? true : "Invalid option"
                            });

                            if (askOverwrite.overwrite === "n") return;
                            ffmpeg(ytdl(idArray[askVid.vid - 1], { quality: 'highestaudio' }))
                                .save(`${downloads}\\Audios\\${supportedFileName}.mp3`)
                                .on('error', (err) => {
                                    console.log("An FFmpeg Error Occurred, Sorry!")
                                    if (debug) console.log(err)
                                    return;
                                })
                                .on('end', () => {
                                    ffmpeg(ytdl(idArray[askVid.vid - 1], { quality: 'highestvideo' }))
                                        .addInput(`${downloads}\\Audios\\${supportedFileName}.mp3`)
                                        .save(`${downloads}\\Videos\\${supportedFileName}.mp4`)
                                        .on('error', (err) => {
                                            console.log("An FFmpeg Error Occurred, Sorry!")
                                            if (debug) console.log(err)
                                            return;
                                        })
                                        .on('end', () => {
                                            return console.log("Succesfully completed video amd audio download!")
                                        });
                                });
                        } else {
                            ffmpeg(ytdl(idArray[askVid.vid - 1], { quality: 'highestaudio' }))
                                .save(`${downloads}\\Audios\\${supportedFileName}.mp3`)
                                .on('error', (err) => {
                                    console.log("An FFmpeg Error Occurred, Sorry!")
                                    if (debug) console.log(err)
                                    return;
                                })
                                .on('end', () => {
                                    ffmpeg(ytdl(idArray[askVid.vid - 1], { quality: 'highestvideo' }))
                                        .addInput(`${downloads}\\Audios\\${supportedFileName}.mp3`)
                                        .save(`${downloads}\\Videos\\${supportedFileName}.mp4`)
                                        .on('error', (err) => {
                                            console.log("An FFmpeg Error Occurred, Sorry!")
                                            if (debug) console.log(err)
                                            return;
                                        })
                                        .on('end', () => {
                                            return console.log("Succesfully completed video amd audio download!")
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

            const askFormat = await prompts({
                type: 'select',
                name: 'format',
                message: 'What Format do you want to download?',
                choices: [
                    { title: 'Audio', value: 'mp3' },
                    { title: 'Video', value: 'mp4' },
                    { title: 'Both', value: 'both' }
                ],
            });

            const searched = await getVideo(link);

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
                    const askOverwrite = await prompts({
                        type: 'text',
                        name: 'overwrite',
                        message: 'This has previously been downloaded, overwrite? \'Y/N\'',
                        validate: response => response.toLowerCase() === "n" ? true : response.toLowerCase() === "y" ? true : "Invalid option"
                    });

                    if (askOverwrite.overwrite === "n") return;
                    ffmpeg(ytdl(searched.id, { quality: 'highestaudio' }))
                        .save(`${downloads}\\Videos\\${supportedFileName}.mp3`)
                        .on('error', (err) => {
                            console.log("An FFmpeg Error Occurred, Sorry!")
                            if (debug) console.log(err)
                            return;
                        })
                        .on('end', () => {
                            ffmpeg(ytdl(searched.id, { quality: 'highestvideo' }))
                                .addInput(`${downloads}\\Videos\\${supportedFileName}.mp3`)
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
                } else {
                    ffmpeg(ytdl(searched.id, { quality: 'highestaudio' }))
                        .save(`${downloads}\\Videos\\${supportedFileName}.mp3`)
                        .on('error', (err) => {
                            console.log("An FFmpeg Error Occurred, Sorry!")
                            if (debug) console.log(err)
                            return;
                        })
                        .on('end', () => {
                            ffmpeg(ytdl(searched.id, { quality: 'highestvideo' }))
                                .addInput(`${downloads}\\Videos\\${supportedFileName}.mp3`)
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
                    const askOverwrite = await prompts({
                        type: 'text',
                        name: 'overwrite',
                        message: 'This has previously been downloaded, overwrite? \'Y/N\'',
                        validate: response => response.toLowerCase() === "n" ? true : response.toLowerCase() === "y" ? true : "Invalid option"
                    });

                    if (askOverwrite.overwrite === "n") return;
                    ffmpeg(ytdl(searched.id, { quality: 'highestaudio' }))
                        .save(`${downloads}\\Audios\\${supportedFileName}.mp3`)
                        .on('error', (err) => {
                            console.log("An FFmpeg Error Occurred, Sorry!")
                        })
                        .on('end', () => {
                            console.log("Succesfully completed audio download!")
                        });
                } else {
                    ffmpeg(ytdl(searched.id, { quality: 'highestaudio' }))
                        .save(`${downloads}\\Audios\\${supportedFileName}.mp3`)
                        .on('error', (err) => {
                            console.log("An FFmpeg Error Occurred, Sorry!")
                        })
                        .on('end', () => {
                            console.log("Succesfully completed audio download!")
                        });
                }
            }
            if (askFormat.format === "both") {
                if (fs.existsSync(`${downloads}\\Videos\\${supportedFileName}.mp4`)) {
                    const askOverwrite = await prompts({
                        type: 'text',
                        name: 'overwrite',
                        message: 'This has previously been downloaded as a Video, overwrite? \'Y/N\'',
                        validate: response => response.toLowerCase() === "n" ? true : response.toLowerCase() === "y" ? true : "Invalid option"
                    });

                    if (askOverwrite.overwrite === "n") return;
                    if (fs.existsSync(`${downloads}\\Audios\\${supportedFileName}.mp3`)) {
                        const askOverwrite = await prompts({
                            type: 'text',
                            name: 'overwrite',
                            message: 'This has previously been downloaded as a Audio, overwrite? \'Y/N\'',
                            validate: response => response.toLowerCase() === "n" ? true : response.toLowerCase() === "y" ? true : "Invalid option"
                        });

                        if (askOverwrite.overwrite === "n") return;
                        ffmpeg(ytdl(searched.id, { quality: 'highestaudio' }))
                            .save(`${downloads}\\Audios\\${supportedFileName}.mp3`)
                            .on('error', (err) => {
                                console.log("An FFmpeg Error Occurred, Sorry!")
                                if (debug) console.log(err)
                                return;
                            })
                            .on('end', () => {
                                ffmpeg(ytdl(searched.id, { quality: 'highestvideo' }))
                                    .addInput(`${downloads}\\Audios\\${supportedFileName}.mp3`)
                                    .save(`${downloads}\\Videos\\${supportedFileName}.mp4`)
                                    .on('error', (err) => {
                                        console.log("An FFmpeg Error Occurred, Sorry!")
                                        if (debug) console.log(err)
                                        return;
                                    })
                                    .on('end', () => {
                                        return console.log("Succesfully completed video amd audio download!")
                                    });
                            });
                    } else {
                        ffmpeg(ytdl(searched.id, { quality: 'highestaudio' }))
                            .save(`${downloads}\\Audios\\${supportedFileName}.mp3`)
                            .on('error', (err) => {
                                console.log("An FFmpeg Error Occurred, Sorry!")
                                if (debug) console.log(err)
                                return;
                            })
                            .on('end', () => {
                                ffmpeg(ytdl(searched.id, { quality: 'highestvideo' }))
                                    .addInput(`${downloads}\\Audios\\${supportedFileName}.mp3`)
                                    .save(`${downloads}\\Videos\\${supportedFileName}.mp4`)
                                    .on('error', (err) => {
                                        console.log("An FFmpeg Error Occurred, Sorry!")
                                        if (debug) console.log(err)
                                        return;
                                    })
                                    .on('end', () => {
                                        return console.log("Succesfully completed video amd audio download!")
                                    });
                            });
                    }

                } else {
                    if (fs.existsSync(`${downloads}\\Audios\\${supportedFileName}.mp3`)) {
                        const askOverwrite = await prompts({
                            type: 'text',
                            name: 'overwrite',
                            message: 'This has previously been downloaded as a Audio, overwrite? \'Y/N\'',
                            validate: response => response.toLowerCase() === "n" ? true : response.toLowerCase() === "y" ? true : "Invalid option"
                        });

                        if (askOverwrite.overwrite === "n") return;
                        ffmpeg(ytdl(searched.id, { quality: 'highestaudio' }))
                            .save(`${downloads}\\Audios\\${supportedFileName}.mp3`)
                            .on('error', (err) => {
                                console.log("An FFmpeg Error Occurred, Sorry!")
                                if (debug) console.log(err)
                                return;
                            })
                            .on('end', () => {
                                ffmpeg(ytdl(searched.id, { quality: 'highestvideo' }))
                                    .addInput(`${downloads}\\Audios\\${supportedFileName}.mp3`)
                                    .save(`${downloads}\\Videos\\${supportedFileName}.mp4`)
                                    .on('error', (err) => {
                                        console.log("An FFmpeg Error Occurred, Sorry!")
                                        if (debug) console.log(err)
                                        return;
                                    })
                                    .on('end', () => {
                                        return console.log("Succesfully completed video amd audio download!")
                                    });
                            });
                    } else {
                        ffmpeg(ytdl(searched.id, { quality: 'highestaudio' }))
                            .save(`${downloads}\\Audios\\${supportedFileName}.mp3`)
                            .on('error', (err) => {
                                console.log("An FFmpeg Error Occurred, Sorry!")
                                if (debug) console.log(err)
                                return;
                            })
                            .on('end', () => {
                                ffmpeg(ytdl(searched.id, { quality: 'highestvideo' }))
                                    .addInput(`${downloads}\\Audios\\${supportedFileName}.mp3`)
                                    .save(`${downloads}\\Videos\\${supportedFileName}.mp4`)
                                    .on('error', (err) => {
                                        console.log("An FFmpeg Error Occurred, Sorry!")
                                        if (debug) console.log(err)
                                        return;
                                    })
                                    .on('end', () => {
                                        return console.log("Succesfully completed video amd audio download!")
                                    });
                            });
                    }
                }
            }
            return;
        }
    }
})();