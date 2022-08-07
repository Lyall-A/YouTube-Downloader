@echo off
title = YouTube Downloader by Lyall  
if exist "node_modules" (
    node ./src/index.js
    timeout /t 5 /nobreak
) else (
    echo First run, installing modules...
    npm i chalk@4.1.2 fluent-ffmpeg@2.1.2 prompts@2.4.2 youtube-sr@4.3.0 ytdl-core@4.11.0 node-fetch@2 @ffmpeg-installer/ffmpeg@1.1.0 @ffprobe-installer/ffprobe@1.4.1 request@2.88.2
    echo Finished installing modules!
    title = YouTube Downloader by Lyall  
    node ./src/index.js
    timeout /t 5 /nobreak
)
