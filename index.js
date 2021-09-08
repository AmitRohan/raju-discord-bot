const fs = require('fs');
const Discord = require('discord.js');




const myAnalytics = require('./src/analytics')
const stateChangeAnnouncer = require('./src/stateChangeAnnouncer')
const musicPlayer = require('./src/musicPlayer')

var announcerChannel = "Chad House";
var songRequestChannelName = "chad-song-requests";

var configFile = './config.json';
var config;

var voiceChannel;
var afkTimer = 0;

let client = new Discord.Client();

client.on('ready', () => {
    console.log("Started!");
    console.log("Initialising Logs");
    refreshVoiceChannel();
    myAnalytics.updateClient(client)
    stateChangeAnnouncer.updateChannel(voiceChannel)
    musicPlayer.updateClient(client)
    musicPlayer.updateChannel(voiceChannel,playerChannel)
    musicPlayer.updateConfig(config)

    myAnalytics.logToAnalytics("Hi","I Am here")
    musicPlayer.song_volume(null, 100)
    disconnectChannel();
    setStatus();
    setInterval(deleteOldAudio, 20000); //
    setInterval(botAfkTimer, 12000);
    return;

});

/*
Removes old temp data of recordings that aren't necessary anymore. Default time till it gets deleted is 60s.
*/
function deleteOldAudio() {
    fs.readdir("./voicedata/", (err, files) => {
        if (err) console.log(err);
        files.forEach(file => {
            try {
                if (Date.now() - file.split("-")[0] > 60000) {

                    fs.unlink(`./voicedata/${file}`, (err) => {
                    });

                }
            } catch (err) {

            }
        });
    });

}


/*
Sets discord bot user activity. (My sample uses STREAMING so his icon is purple.)
*/
function setStatus() {
    client.user.setActivity("status.", {
        type: "Listening to " + config.commandPrefix,
        url: "https://github.com/AmitRohan/raju-discord-bot"
    }).catch(console.error);
}



/*
Simple AFK timer so that bot doesnt stick in voice channels for too long.
Its attached to a setInterval() function so that this function gets run every 2 minutes.
Once the AFkTimer count value gets to 5 (10 minutes), with 0 people in the same voice channel
that hes in, he will leave and remove the song queue.
 */
function botAfkTimer() {
    if (client.voice.connections.size > 0) {
        //console.log(client.voiceConnections.first(1)[0].channel.members.size);
        if (client.voice.connections.first(1)[0].channel.members.size < 2) {
            afkTimer++;
        } else {
            afkTimer = 0;
        }
    }
    if (afkTimer >= 5) { //2 minutes 5 instances so 10 minute timer.
        myAnalytics.logToAnalytics("Info","`Been AFK for 10 minutes. DCing`")

        stop(client.voice.connections.first(1)[0].channel.members.first(1)[0]);

    }


}

function disconnectChannel() {
    for (const channel of client.channels.cache) {
        if (channel[1].type == "voice") {
            for (const member of channel[1].members) {
                if (member[0] == client.user.id) {
                    member[1].voice.channel.join().then(connection => {
                        member[1].voice.channel.leave();
                    });

                    console.log('Disconnect from channel')
                }
            }
        }
    }
}


client.on("voiceStateUpdate", function(oldMember, newMember){
    stateChangeAnnouncer.handleVoiceStateChanges(oldMember,newMember)
});

const refreshVoiceChannel = () =>{
    
    voiceChannel = client.channels.cache.find(channel => channel.name === announcerChannel)
    

    playerChannel = client.channels.cache.find(channel => channel.name === songRequestChannelName)

}

client.on('message', (msg
    ) => {
    refreshVoiceChannel();


    if (msg.content == undefined)
        return
    var arrString = msg.content.split(' ')

    if(msg.channel.name === songRequestChannelName){

    }else if(msg.content.charAt(0) === config.commandPrefix
                    || msg.content.split(' ')[0].toLocaleLowerCase() === config.commandPrefix.toLocaleLowerCase()){
        arrString.shift()
    }else{
        return;
    }
  
        var cmd = arrString[0];
        //remove our command using shift
        arrString.shift()
        var contents = arrString.join(" ");
            
        musicPlayer.onTextMessageUpdate(msg,cmd,contents)
});

/*
First function to be run in all the code. Sets up our config file with necessary tokens and other important stuff. Config file path should be
at the top as a global variable.
*/
async function reloadConfig() {
    return new Promise(function (resolve, reject) {
        
            fs.readFile(configFile, 'utf8', function (err, json) {
                if (err) {
                    config = {
                       
                        "discordToken": process.env.discordToken,
                        "discordDevID":  process.env.discordDevID,
                        "commandPrefix" :  process.env.commandPrefix,
                        "spotifyClientID" :  process.env.spotifyClientID,
                        "spotifyClientSecret" :  process.env.spotifyClientSecret

                    }
                    resolve(true)
                }
                try {
                    config = JSON.parse(json);
                }catch(e){
                    config = {
                        
                        "discordToken": process.env.discordToken,
                        "discordDevID":  process.env.discordDevID,
                        "commandPrefix" :  process.env.commandPrefix,
                        "spotifyClientID" :  process.env.spotifyClientID,
                        "spotifyClientSecret" :  process.env.spotifyClientSecret
                    }
                }
                resolve(true)
            });
       
    });
}

/*
Initial boot sequence to make sure that we properly load our config file first and boot in order to avoid crashes.
Sets up our config global and other necessary stuffs.
*/
async function bootSequence() {
    await reloadConfig();
    await musicPlayer.initializeSpotifyAPI(config);
    await client.login(config.discordToken)//.catch(console.error);
    return true;
}

bootSequence().catch(err => console.error(err))