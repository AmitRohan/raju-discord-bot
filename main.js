require('dotenv').config();

const { Client, Intents } = require('discord.js');
const client = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES] });


const settings = {
    prefix: '!',
    token: process.env.TOKEN
};
const { Player } = require("discord-music-player");

const player = new Player(client, {
    leaveOnEmpty: true, // This options are optional.
});
// You can define the Player as *client.player* to easly access it.
client.player = player;




client.on("ready", () => {
  console.log(`Logged in as ${client.user.tag}!`)
  console.log("I am ready to Play with DMP 🎶");
})

client.on("message", msg => {
  if (msg.content === "ping") {
    msg.reply({ content: 'I Work!', ephemeral: true });
  }
})

client.login(settings.token);
