@echo off
title = YouTube Downloader by Lyall
node ./src/presetCreator.js
if exist "Delete this if you know what your doing" (
    timeout /t 5 /nobreak
) else (
    pause
)