# **YouTube Downloader**

**Customizable YouTube Downloader capable of downloading any content at any quality**

No FFmpeg installation required!

 - Presets
 - Up to 8k quality
 - Audio or Video downloads
 - Built-in YouTube search
 - Console and Web app

**This YouTube Downloader does not work on age-restricted or private content**

To use YouTube Downloader in your browser open the config.json file found in the src folder using notepad, next to "enableWeb" change the value from false to true and save. You can access it in your browser by going [here](http://localhost) (http://localhost)

Node.js and NPM is required and can be installed [here](https://nodejs.org)

# **Fixing errors**
 **EADDRINUSE: address already in use:**
 This issue can occur if you have enabled the web version of YouTube Downloader, this occurs when you are running another website on your Computer, you can fix this by opening the config.json file found in the src file using notepad and changing the value next to "webPort" to something different (like 4444). Click save and error should no longer appear, to access the web version you will have to go to http://localhost:4444, replace the number 4444 with whatever you put as the webPort value in config.json
