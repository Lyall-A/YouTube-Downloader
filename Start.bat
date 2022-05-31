@echo off
title = YouTube Downloader by Lyall
node ./src/index.js
if exist "Delete this if you know what your doing" (
    timeout /t 5 /nobreak
) else (
    pause
)
