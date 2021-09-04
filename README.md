# 🎤 Raju Discord Bot

Raju Discord Bot is a Discord Bot built using [discord.js](https://discord.js.org) to be a multi-purpose discord bot. 

## ⚠Requirements
1. [Discord Bot Token](https://discordjs.guide/preparations/setting-up-a-bot-application.html#creating-your-bot)
2. [Node.js 14.0.0 or newer](https://nodejs.org/)

## ⚡Installation

Easily deployable using git clone:

```bash
git clone https://github.com/quentinmay/discord-voice-assistant.git
cd raju-voice-assistant
npm run setup
```
Now you must configure the bot before running using config example file:
```bash
mv config.json.example config.json
```
## Simple Configuration (Required)
Only the top 2 are required for basic functionality.

```json
{
    "discordToken": "",
    "discordDevID": "",
    "commandPrefix": "0",
    "spotifyClientID": "",
    "spotifyClientSecret": "",
}
```

## 🚀Initial Startup
Just startup the script now that everything has been built and you've filled your config file.
```bash
node index.js
```

For Dev Purpose (Hot Reload)
```bash
npm run hot-reload
```
