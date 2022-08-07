@echo off
title = YouTube Downloader by Lyall  
if exist "node_modules" (
    node ./src/index.js
    timeout /t 5 /nobreak
) else (
    echo First run, installing modules...
    npm i
    echo Finished installing modules!
    title = YouTube Downloader by Lyall  
    node ./src/index.js
    timeout /t 5 /nobreak
)
