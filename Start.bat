@echo off
title = YouTube Downloader
if exist "node_modules" (
    node ./src/index.js
    timeout /t 5 /nobreak
) else (
    echo First run, installing modules...
    npm i
    echo Finished installing modules!
    title = YouTube Downloader
    node ./src/index.js
    timeout /t 5 /nobreak
)
