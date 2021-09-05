const fs = require('fs');
const Discord = require('discord.js');

const ytsr = require('ytsr');
const ytdl = require('ytdl-core');
const ytfps = require('ytfps');
const urlParser = require('js-video-url-parser')

const googleTTS = require('google-tts-api');

const myAnalytics = require('./src/analytics')

var stringSimilarity = require('string-similarity');
const wordsToNumbers = require('words-to-numbers');




var SpotifyWebApi = require('spotify-web-api-node');
var spotifyUri = require('spotify-uri');
var config;

var spotifyApi;


var musicStream;
var pause = false;


var queue = [];
var dispatcher;
var voiceChannel;

let voiceConnections = new Map();
let voiceReceivers = new Map();

let client = new Discord.Client();
let textChannel;

var repeat = false;
var volume = 100;

var afkTimer = 0;

var configFile = './config.json';






client.on('ready', () => {
    console.log("Started!");
    console.log("Initialising Logs");
    myAnalytics.updateClient(client)

    myAnalytics.logToAnalytics("Hi","I Am here")
    song_volume(null, 100)
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
    if(!voiceChannel){
        return;
    }
    var userName = newMember.member.user.username;
    var str = "";

    if(newMember.channelID !== oldMember.channelID){
        // New Join
        str = userName + " has joined";
    }else{
        if(newMember.mute !== oldMember.mute){
            str = userName + " has " + (newMember.mute ? "" : "un") + "muted";
        }

        if(newMember.streaming !== oldMember.streaming){
            str = userName + " has " + (newMember.streaming ? "started" : "stoped") + " streaming";
        }
    }

    console.log(`voiceStateUpdate :`,str);

    if(str !== ""){
        myAnalytics.logToAnalytics("Info",str)
        googleTTS
        .getAudioBase64(str, {
            lang: 'en',
            slow: false,
            host: 'https://translate.google.com',
            timeout: 10000,
        })
        .then(
            base64data => {
                fs.writeFileSync('voicedata/fileToPlay.mp3', Buffer.from(base64data.replace('data:audio/mp3; codecs=opus;base64,', ''), 'base64'));


                if(voiceChannel)
                    voiceChannel.join().then(connection =>{
                        dispatcher = connection.play("./voicedata/fileToPlay.mp3");
                    }).catch(err => console.log(err));
            }
        ) // base64 text
        .catch(console.error);
    }

});


client.on('message', (msg) => {
    if (msg.content.charAt(0) === config.commandPrefix
            || msg.content.split(' ')[0].toLocaleLowerCase() === config.commandPrefix.toLocaleLowerCase()) {
        textChannel = msg.channel;

        var arrString = msg.content.split(' ')
        //remove our commandPrefix using shift
        arrString.shift()

        var cmd = arrString[0];
        //remove our command using shift
        arrString.shift()
        var contents = arrString.join(" ");
        
        
        console.log("Cmd",cmd,contents);

        switch (cmd) {
            case 'test':
                getSpotifyList().then(function (genreList) {
                    var names = [];
                    for (item of genreList.fields) {
                        names.push(item.name);
                    }
                    //gaming 13
                    var matches = stringSimilarity.findBestMatch('gaming', names);
                    if (matches.bestMatch.rating < .7) {
                        console.log("None close found")
                    } else {
                        console.log(matches.bestMatchIndex + ":" + matches.bestMatch.target);
                    }
                });
                break;
            case 'fix':
                playMusic();
                break;
           case 'queue':
                //console.log(client.voiceConnections);
                sendQueue(msg.channel);
                //console.log(queue);
                break;
            case 'play':
            case 'playtop':
                if (msg.member.voice.channel) {
                    var top = true;
                    if (cmd == 'play') top = false;
                    voiceChannel = msg.member.voice.channel;
                    msg.react('🍊');
                    commandPlay(msg.member, cmd, contents, top);
                } else {
                    myAnalytics.logToAnalytics("Error","Authors voice channel doesnt exist")
                }

                break;
            case 'spotify':
            case 'playlist':
                if (config.spotifyClientID && config.spotifyClientSecret) {
                    if (!msg.member.voice.channel) {
                        myAnalytics.logToAnalytics("Error","`Must be in a voice channel to use this command.`")
                    } else {
                        voiceChannel = msg.member.voice.channel;
                        spotifyGenreList(msg.channel, contents, msg.member);
                    }
                } else {
                    myAnalytics.logToAnalytics("Error","`spotifyClientID or spotifyClientSecret missing. Will not be able to use spotify functionality.`")
                }
                break;
            case 'volume':
                if (!isNaN(parseInt(contents.trim().split(' ')[0]))) {
                    song_volume(msg.channel, contents.split(' ')[0]);
                } else {
                    myAnalytics.logToAnalytics("Volume","`" + volume + "`")
                }

                break;
            case 'skip':
                myAnalytics.logToAnalytics("Info","`Song skipped.`")
                song_skip();
                break;

            case 'pause':
                myAnalytics.logToAnalytics("Info","`Song paused.`")
                song_pause();
                break;
            case 'resume':
                myAnalytics.logToAnalytics("Info","`Song resumed.`")
                song_resume();
                break;
            case 'clear':
                myAnalytics.logToAnalytics("Info","`Song cleared.`")
                song_clear();
                break;
            case 'shuffle':
                myAnalytics.logToAnalytics("Info","`Songs shuffled.`")
                song_shuffle(msg.channel);
                break;
            case 'on':
            case 'join':
                textChannel = msg.channel;
                start(msg.member);
                break;
            case 'off':
            case 'stop':
            case 'disconnect':
            case 'reset':
            case 'restart':
                stop(msg.member);
                break;
            case 'crash':
                if (msg.author.id == config.discordDevID) {
                    myAnalytics.logToAnalytics("Error","`Crash command sent.`")
                    process.exit(0);
                }
            default:
                break;
        }
        //updateConfig();
    }
});



/*
Huge command needs to be split up. Uses spotify api to get a list of pregenerated genres from spotify website
and list them out OR if given a genre name string, prints out the spotify playlist for that genre OR
when given a genre name string and number selection of the playlists, starts playing the songs from
that specific playlist.

Example inputs
content = "3 1" //plays the 3rd genre and the 1st playlist from that genre list.

//with no contents, will output a list of all featured genres

//with 1 number content, will output all playlists  for that genre

//with 2 numberse in content, will goto that genre and find that playlist and then send to spotifyPlayListOrAlbum()

*/
function spotifyGenreList(channel, content, author) {
    content.trim();

    if (content.split(' ') == '') {
        content = []
    } else {
        content = content.split(' ');
    }
    console.log(content);
    var playlistSelected;
    if (content.length == 2) {

    }

    //with no contents, will output a list of all featured genres

    //with 1 number content, will output all playlists  for that genre

    //with 2 numberse in content, will goto that genre and find that playlist and then send to spotifyPlayListOrAlbum()
    //
    if (content.length <= 2) {

        spotifyApi.clientCredentialsGrant().then(function (data) {
            console.log('The access token expires in ' + data.body['expires_in']);
            console.log('The access token is ' + data.body['access_token']);

            // Save the access token so that it's used in future calls
            spotifyApi.setAccessToken(data.body['access_token']);
            spotifyApi.getCategories({
                limit: 50,
                offset: 0,
                country: 'US',
                locale: 'sv_SE'
            })
                .then(function (data) {
                    if (content.length == 0) {
                        myAnalytics.logToAnalytics("Info","`Listing all featured genres on spotify.`")
                        getSpotifyList().then(function (genreList) {

                        });

                        /////////////////////////////////////////////////////////////
                        var embedCount = Math.ceil((data.body.categories.total / 25));
                        if (embedCount > 2) embedCount = 2;
                        for (var i = 0; i < embedCount; i++) {
                            var currentIndex = i + 1; //Add 1 so that we dont start with 0 for nicer look


                            var genreList = {
                                title: "\u200b",
                                url: 'https://open.spotify.com/browse/genres',
                                color: 1947988, //this is spotify green in their weird color system thing https://leovoel.github.io/embed-visualizer/
                                footer: {
                                    icon_url: client.user.defaultAvatarURL,
                                    text: `Page ${currentIndex}/${embedCount}`
                                },
                                thumbnail: {
                                    url: 'https://1000logos.net/wp-content/uploads/2017/08/Spotify-Logo.png'
                                },
                                author: {
                                    name: "Spotify Genre List",
                                    url: "https://open.spotify.com/browse/genres",
                                    icon_url: client.user.defaultAvatarURL
                                },
                                fields: []
                            }
                            genreList.fields = [];

                            data.body.categories.items.forEach(function (item, i) {

                                if (i >= ((currentIndex - 1) * 25) && i < (currentIndex * 25)) {
                                    var name = item.name
                                    genreList.fields.push({
                                        name: '\u200b',
                                        value: "`" + (i + 1) + "`. [" + item.name + "](" + 'https://open.spotify.com/view/' + item.id + "-page" + ")"
                                    });
                                }
                            });
                            //console.log(genreList);
                            if (genreList.fields.length >= data.body.categories.items.length % 25) { //only sends if it has enough fields to take into account all the playlists
                                myAnalytics.logToAnalytics("Info","`Listing all featured genres on spotify.`")
                                myAnalytics.logDirectly({
                                    embed: genreList
                                })
                            } else {
                                myAnalytics.logToAnalytics("Error","`sending this embed.`")
                                myAnalytics.logDirectly({
                                    embed: genreList
                                })
                            }

                        }
                        /////////////////////////////////////////////////////////////////////////////////////
                    }

                    if (content.length >= 1) {
                        var genreSelected = parseInt(content[0]);
                        if (isNaN(genreSelected)) return;
                        genreSelected--; //To make up for starting at 0
                    } else {
                        return;
                    }
                    var selectedGenre = data.body.categories.items[genreSelected];
                    spotifyApi.getPlaylistsForCategory(data.body.categories.items[genreSelected].id, {
                        country: 'US',
                        limit: 50,
                        offset: 0
                    })
                        .then(function (data) {

                            if (content.length == 1) {
                                myAnalytics.logToAnalytics("Info","`Listing all playlists for " + selectedGenre.name + "``")
                                //////////////////////////////////////////////////////////////
                                var embedCount = Math.ceil((data.body.playlists.total / 25));
                                if (embedCount > 2) embedCount = 2;
                                for (var i = 0; i < embedCount; i++) {
                                    var currentIndex = i + 1; //Add 1 so that we dont start with 0 for nicer look
                                    var genrePlayListList = {
                                        title: "\u200b",
                                        url: 'https://open.spotify.com/view/' + selectedGenre.id + "-page",
                                        color: 1947988, //this is spotify green in their weird color system thing https://leovoel.github.io/embed-visualizer/
                                        footer: {
                                            icon_url: client.user.defaultAvatarURL,
                                            text: `Page ${currentIndex}/${embedCount}`
                                        },
                                        thumbnail: {
                                            url: 'https://1000logos.net/wp-content/uploads/2017/08/Spotify-Logo.png'
                                        },
                                        author: {
                                            name: selectedGenre.name + " Playlists",
                                            url: 'https://open.spotify.com/view/' + selectedGenre.id + "-page",
                                            icon_url: client.user.defaultAvatarURL
                                        },
                                        fields: []
                                    }
                                    genrePlayListList.fields = [];

                                    data.body.playlists.items.forEach(function (item, i) {
                                        if (i >= ((currentIndex - 1) * 25) && i < (currentIndex * 25)) {
                                            var name = item.name
                                            genrePlayListList.fields.push({
                                                name: '\u200b',
                                                value: "`" + (i + 1) + "`. [" + item.name + "](" + 'https://open.spotify.com/playlist/' + item.id + ")",
                                                url: 'https://open.spotify.com/playlist/' + item.id,
                                            });
                                        }
                                    });
                                    //console.log(genreList);
                                    if (genrePlayListList.fields.length >= data.body.playlists.items.length % 25) { //only sends if it has enough fields to take into account all the playlists
                                        myAnalytics.logDirectly({
                                            embed: genrePlayListList
                                        })
                                    } else {
                                        //console.log(data.body.playlists);
                                        myAnalytics.logToAnalytics("Error","`sending this embed.")
                                        myAnalytics.logDirectly({
                                            embed: genrePlayListList
                                        })
                                    }
                                }
                                ///////////////////////////////////////////////////////////////
                                //console.log(data.body.playlists.items);
                            }
                            if (content.length >= 2) {
                                var playlistSelected = parseInt(content[1]);
                                if (isNaN(playlistSelected)) return;
                                playlistSelected--; //To make up for starting at 0
                                myAnalytics.logToAnalytics("Info","`Playlist selected " + data.body.playlists.items[playlistSelected].name + "`")
                                spotifyPlaylistOrAlbum(data.body.playlists.items[playlistSelected].id, 'playlist', author)
                            }

                        }, function (err) {
                            console.log("Something went wrong!", err);
                        });


                }, function (err) {
                    console.log("Something went wrong!", err);
                });

        },
            function (err) {
                console.log('Something went wrong when retrieving an access token', err);
            });


    }


}

function getSpotifyList() {

    return new Promise(function (resolve, reject) {
        spotifyApi.clientCredentialsGrant().then(function (data) {
            console.log('The access token expires in ' + data.body['expires_in']);
            console.log('The access token is ' + data.body['access_token']);

            // Save the access token so that it's used in future calls
            spotifyApi.setAccessToken(data.body['access_token']);
            spotifyApi.getCategories({
                limit: 50,
                offset: 0,
                country: 'US',
                locale: 'sv_SE'
            })
                .then(function (data) {

                    /////////////////////////////////////////////////////////////
                    var embedCount = Math.ceil((data.body.categories.total / 25));
                    if (embedCount > 2) embedCount = 2;
                    for (var i = 0; i < embedCount; i++) {
                        var currentIndex = i + 1; //Add 1 so that we dont start with 0 for nicer look


                        var genreList = {
                            title: "\u200b",
                            url: 'https://open.spotify.com/browse/genres',
                            color: 1947988, //this is spotify green in their weird color system thing https://leovoel.github.io/embed-visualizer/
                            footer: {
                                icon_url: client.user.defaultAvatarURL,
                                text: `Page ${currentIndex}/${embedCount}`
                            },
                            thumbnail: {
                                url: 'https://1000logos.net/wp-content/uploads/2017/08/Spotify-Logo.png'
                            },
                            author: {
                                name: "Spotify Genre List",
                                url: "https://open.spotify.com/browse/genres",
                                icon_url: client.user.defaultAvatarURL
                            },
                            fields: []
                        }
                        genreList.fields = [];

                        data.body.categories.items.forEach(function (item, i) {

                            if (i >= ((currentIndex - 1) * 25) && i < (currentIndex * 25)) {
                                genreList.fields.push({
                                    name: item.name,
                                    number: (i + 1),
                                    value: 'https://open.spotify.com/view/' + item.id + "-page"
                                });
                            }
                        });
                        //console.log(genreList);
                        if (genreList.fields.length >= data.body.categories.items.length % 25) { //only sends if it has enough fields to take into account all the playlists
                            resolve(genreList);
                        } else {
                            reject("Error");
                        }
                    }

                })
        })
    });
}

/*
First parses different potential volume inputs because could potentially be from speech recognition. Ex. fifty turns into 50
Then updates the dispatcher and updates the volume file.
*/
function song_volume(channel, vol) {
    if (isNaN(vol)) {
        if (isNaN(wordsToNumbers(vol))) {
            return;
        } else {
            vol = wordsToNumbers(vol);
        }
    }
    if (vol < 0 || vol > 100) return;
    myAnalytics.logToAnalytics("Info","`Volume set to " + vol + ".`")
    volume = vol;
    fs.appendFile('./volume.txt', '\n' + vol, (err) => {
        if (err) throw err;
    });
    if (dispatcher) {
        dispatcher.setVolumeLogarithmic(volume / 100);
    }
}

function song_shuffle(channel) {
    if (queue.length > 2) {
        var tmp = [].concat(queue);
        tmp.shift();
        tmp = shuffle(tmp);
        //console.log(tmp);
        var tmp2 = [queue[0]];
        for (var i = 0; i < tmp.length; i++) {
            tmp2.push(tmp[i]);
            //console.log(tmp2);
        }
        queue = tmp2;
        //console.log(tmp2);
        //queue = [queue[0]];
        //queue.concat(shuffle(tmp));
        //console.log(queue);
        myAnalytics.logToAnalytics("Info","`Queue has been shuffled.`")
    } else {
        myAnalytics.logToAnalytics("Info","`Not enough songs to shuffle.`")
    }
}

/* Not my code needs to be fixed. */
function shuffle(arra1) {
    var ctr = arra1.length,
        temp, index;

    // While there are elements in the array
    while (ctr > 0) {
        // Pick a random index
        index = Math.floor(Math.random() * ctr);
        // Decrease ctr by 1
        ctr--;
        // And swap the last element with it
        temp = arra1[ctr];
        arra1[ctr] = arra1[index];
        arra1[index] = temp;
    }
    return arra1;
}


function sendQueue(channel) {
    try {
        if (queue.length == 0) {
            myAnalytics.logToAnalytics("Info","`There are no songs in queue..`")
            return;
        }
        const exEmb = {
            title: "__" + queue[0].TITLE + "__",
            url: queue[0].URL,
            color: 10181046, //this is purple in their weird color system thing https://leovoel.github.io/embed-visualizer/
            footer: {
                icon_url: client.user.displayAvatarURL(),
                text: queue.length + " songs in queue."
            },
            thumbnail: {
                url: queue[0].THUMBNAIL
            },
            author: {
                name: "Song queue",
                url: "",
                icon_url: client.user.defaultAvatarURL
            },
            fields: [

            ]

        }
        exEmb.fields = [];
        queue.forEach(function (video, i) {

            if (i < 25 && i > 0) {
                var name = queue[i - 1].MEMBER.user.username
                exEmb.fields.push({
                    name: "`Requested by: " + name + "`",
                    value: "`" + i + "`. [" + video.TITLE + "](" + video.URL + ")",
                    url: video.URL,
                    //value: "`Requested By: " + video.MEMBER.user.username + "`"
                });
                //exampleEmbed.addField(`${i}. [${video.TITLE}](${video.URL})`, '.');
            }
        });

        myAnalytics.logDirectly({
            embed: exEmb
        });
    } catch (err) {
        myAnalytics.logToAnalytics("Error","`while sending queue.`")
        console.log(err);
    }
}

/*
All of these are pretty obvious utility functions for the dispatcher.
*/
function song_clear() {
    if (queue.length >= 1) {
        queue = [queue[0]];
    }
}

function song_resume() {
    if (dispatcher) {
        pause = false;
        dispatcher.resume();
    }
}

function song_pause() {
    if (dispatcher) {
        pause = true;
        dispatcher.pause();
    }

}


function song_skip() {
    if (dispatcher) {

        dispatcher.end();
        playMusic();
        //dispatcher.end();
    }
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

//find if message is link
//if message is valid link, get youtube info
//else do youtube search query and get youtube info for first
//after either, add to queue

function commandPlay(member, cmd, content, top) {

    try {
        searchYoutube(member, content, top);
        return;



    } catch (err) {
        console.log(`Error on commandPlay function: ${err}`);
    }
}

function errorFindingVideo(err) {
    console.log(err);
    console.log('Error finding video');
    myAnalytics.logToAnalytics("Error","`Error finding video.`")
    song_skip();
    // fs.appendFileSync('./console.txt', 'Error finding video' + '\n');
}

async function searchYoutube(author, content, top) {

    // console.log(urlParser.parse(content));
    if (urlParser.parse(content)) {
        //Checks to see if its a video, on youtube, and IS NOT a playlist
        if ((urlParser.parse(content)).mediaType == 'video' && (urlParser.parse(content)).provider == 'youtube' && !(urlParser.parse(content)).list) {
            console.log('valid youtube url');

            if (content.indexOf("start_radio") == -1) {
                var video = await ytdl.getBasicInfo(content);

                var chosenVideo;
                //console.log(video);
                chosenVideo = {
                    URL: content,
                    TITLE: video.videoDetails.title,
                    DURATION: video.videoDetails.lengthSeconds,
                    THUMBNAIL: video.videoDetails.thumbnails[0].url,
                    MEMBER: author
                }
                add_to_queue(chosenVideo, top, false)



            }
            //If its not a video, then check if its youtube and IS a list
        } else if ((urlParser.parse(content)).provider == 'youtube' && (urlParser.parse(content)).list) {
            console.log('going for ' + (urlParser.parse(content)).list);

            ytfps((urlParser.parse(content)).list).then(items => {
                myAnalytics.logToAnalytics("Info","`Adding playlist to queue.`")
                myAnalytics.logToAnalytics("Info","`" + items.videos.length + " songs from playlist added to queue.`")

                items.videos.forEach(item => {
                    if (item.title == 'Private video') {
                        return;
                    }
                    var thumbnailURL = 'https://awmaa.com/wp-content/uploads/2017/04/default-image.jpg'
                    if (item.thumbnail_url) thumbnailURL = item.thumbnail_url;
                    var video = {
                        URL: `https://www.youtube.com/watch?v=${item.id}`,
                        TITLE: item.title,
                        DURATION: parseInt(item.milis_length / 1000),
                        THUMBNAIL: thumbnailURL,
                        MEMBER: author
                    };
                    add_to_queue(video, top, true);
                })

            }).catch(err => {
                throw err;
            });
        }

    } else if (content.indexOf('spotify') != -1) {
        if (spotifyUri.parse(content).type == 'album' || spotifyUri.parse(content).type == 'playlist') {
            spotifyPlaylistOrAlbum(spotifyUri.parse(content).id, spotifyUri.parse(content).type, author);
        }

    } else {
        try {
            var video = null;
            const filters = await ytsr.getFilters(content);
            const filter = filters.get('Type').get('Video');
            var options = {
                limit: 5,
                nextpageRef: filter.ref,
            }
            const searchResults = await ytsr(content, options);
            // console.log(searchResults)

            const videos = searchResults.items;
            for (var i = 0; i < videos.length; i++) { //Checks if the duration of the video is greater than 0 to avoid live videos.
                if (videos[i].duration) {
                    video = videos[i];
                    break;
                }
            }
            if (video == null) {
                console.log('No video found.');
                // fs.appendFileSync('./console.txt', 'No Video found' + '\n');
                throw new Error("No video found")
            }
            var hours = 0;
            var minutes = 0;
            var seconds = 0;
            var durationArray = video.duration.split(':');
            if (durationArray.length == 2) { //minutes:seconds
                minutes = durationArray[0];
                seconds = durationArray[1];

            } else if (durationArray.length == 3) { //hours:minutes:seconds
                hours = durationArray[0];
                minutes = durationArray[1];
                seconds = durationArray[2];

            }
            var durationSeconds = (hours * 3600) + (minutes * 60) + (seconds * 1); //duration in seconds
            var chosenVideo;
            chosenVideo = {
                URL: video.url,
                TITLE: video.title,
                DURATION: durationSeconds,
                THUMBNAIL: video.bestThumbnail.url,
                MEMBER: author
            };
            add_to_queue(chosenVideo, top, false)
        } catch (err) {
            console.log(err);

        }
    }

}

function spotifyPlaylistOrAlbum(id, type, author) {

    try {
        spotifyApi.clientCredentialsGrant().then(
            function (data) {
                console.log('The access token expires in ' + data.body['expires_in']);
                console.log('The access token is ' + data.body['access_token']);

                // Save the access token so that it's used in future calls
                spotifyApi.setAccessToken(data.body['access_token']);
                if (type == 'playlist') {
                    spotifyApi.getPlaylist(id).then(function (data) {
                        //console.log(data.body.tracks.items);
                        data.body.tracks.items.forEach(function (item, index) {
                            if (item.track == null) return;
                            var song_name = item.track.name;
                            var artists = [];
                            item.track.artists.forEach(artist => {

                                artists.push(artist.name);
                            })
                            var track = {
                                URL: `https://open.spotify.com/track/${item.track.id}`,
                                TITLE: (artists.join(', ') + " - " + song_name),
                                DURATION: parseInt(item.track.duration_ms / 1000),
                                THUMBNAIL: 'https://1000logos.net/wp-content/uploads/2017/08/Spotify-Logo.png',
                                MEMBER: author
                            };

                            add_to_queue(track, false, true);
                        });

                    }, function (err) {
                        console.log('Something went wrong!', err);
                    });
                } else if (type == 'album') {
                    spotifyApi.getAlbumTracks(id, {
                        limit: 50,
                        offset: 0
                    })
                        .then(function (data) {
                            //console.log(data.body.items);
                            data.body.items.forEach(function (item, index) {
                                if (item == null) return;
                                var song_name = item.name;
                                var artists = [];
                                item.artists.forEach(artist => {

                                    artists.push(artist.name);
                                })
                                var track = {
                                    URL: `https://open.spotify.com/track/${item.id}`,
                                    TITLE: (artists.join(', ') + " - " + song_name),
                                    DURATION: parseInt(item.duration_ms / 1000),
                                    THUMBNAIL: 'https://1000logos.net/wp-content/uploads/2017/08/Spotify-Logo.png',
                                    MEMBER: author
                                };

                                add_to_queue(track, false, true);
                            });
                        }, function (err) {
                            console.log('Something went wrong!', err);
                        });

                } else {
                    console.log('Not playlist or album');
                }
            },
            function (err) {
                console.log('Something went wrong when retrieving an access token', err);
            });
    } catch (err) {
        console.log(err);
    }
}

function add_to_queue(video, top, playlist) {
    console.log("adding to queue " + video.URL);
    var position = queue.length;
    if (top == true) {
        if (queue.length > 0) {
            position = 1;
        } else {
            position = 0;
        }
    }
    if (playlist == false) {
        const addedToQueueEmbed = new Discord.MessageEmbed()
            .setColor('#9b59b6')
            .setTitle(video.TITLE)
            .setURL(video.URL)
            .setAuthor('Added to queue', video.MEMBER.user.avatarURL, '')
            .setThumbnail(video.THUMBNAIL)
            .addField('Song Duration', convertTime(video.DURATION), true)
            .addField('Position in queue', position, true);
        myAnalytics.logDirectly(addedToQueueEmbed)
        
    }
    if (top == true) {
        if (queue.length > 0) {
            queue.splice(1, 0, video);
        } else {
            queue.unshift(video)
        }
    } else {
        queue.push(video)
    }
    //console.log(queue.length);
    if (queue.length == 1) {
        console.log('playMusic because only 1 in queue');
        playMusic();
        //no song playing so start playing

    }

}

async function playMusic() {
    if (queue.length == 0) return;
    //updateConfig();
    // console.log(queue[0]);
    //This means that it is a spotify song in the queue
    if (queue[0].THUMBNAIL == 'https://1000logos.net/wp-content/uploads/2017/08/Spotify-Logo.png') {

        var video = null;
        // console.log(`${queue[0].TITLE} is the spotify name`);
        try {
            const filters = await ytsr.getFilters(queue[0].TITLE);
            const filter = filters.get('Type').get('Video');
            var options = {
                limit: 5,
                nextpageRef: filter.ref,
            }
            const searchResults = await ytsr(queue[0].TITLE, options);
            // console.log(searchResults)

            const videos = searchResults.items;
            for (var i = 0; i < videos.length; i++) { //Checks if the duration of the video is greater than 0 to avoid live videos.
                if (videos[i].duration) {
                    video = videos[i];
                    break;
                }
            }
            if (video == null) {
                console.log('No video found.');
                // fs.appendFileSync('./console.txt', 'No Video found' + '\n');
                throw new Error("No video found")
            }
            var hours = 0;
            var minutes = 0;
            var seconds = 0;
            var durationArray = video.duration.split(':');
            if (durationArray.length == 2) { //minutes:seconds
                minutes = durationArray[0];
                seconds = durationArray[1];

            } else if (durationArray.length == 3) { //hours:minutes:seconds
                hours = durationArray[0];
                minutes = durationArray[1];
                seconds = durationArray[2];

            }
            var durationSeconds = (hours * 3600) + (minutes * 60) + (seconds * 1); //duration in seconds
            var chosenVideo;
            chosenVideo = {
                URL: video.url,
                TITLE: video.title,
                DURATION: durationSeconds,
                THUMBNAIL: video.bestThumbnail.url,
                MEMBER: queue[0].MEMBER
            };

            //add_to_queue(chosenVideo, top, false)

            queue[0] = chosenVideo;
            createStream(queue[0].URL)
        } catch (err) {
            errorFindingVideo(err)
        }
    } else {
        createStream(queue[0].URL)
    }
    //check to see if dispatcher voice connection exists if not, make new one
    //if (!seek) seek = 0;






}

function createStream(url) { //NEEDS FIXING. client.voiceConnections.length is NEVER going to run because you have to use .size//////////////////////////////////////////////////////////////////////////////////
    const streamOptions = {
        seek: 0
    }; //, volume: volume};
    console.log("Streaming",url);
    myAnalytics.logToAnalytics("Info","`Playing  "+ url +"`")
    musicStream = ytdl(url, {
        filter: 'audioonly'
    });
    var connection;
    if (client.voice.connections.size == 1) {
        console.log("1",url);
        connection = client.voice.connections.first(1)[0];
        if (!connection) return;
        dispatcher = connection.play(musicStream, streamOptions);
        dispatcher.setVolumeLogarithmic(volume / 100);
        pause = false;
        /*
        dispatcher.on('end', () => {
            console.log('dispatcher end 1')
            if (repeat == false) {
                queue.shift();
            }
            playMusic();
        });
        */
        dispatcher.on('speaking', (speaking) => { //when finished speaking, play next song because that means songs over
            console.log("Audio Stopped");
            textChannel
            if (pause == true) return;
            if (speaking == 1) return; //still speaking
            // console.log(speaking);
            console.log('dispatcher end 1')
            if (repeat == false) {
                // console.log('no repeat so shift queue. 2');

                queue.shift();
            }
            playMusic();
        });

    } else if (voiceChannel) {
        console.log("2",url);

        voiceChannel.join().then((connection) => {
            dispatcher = connection.play(musicStream, streamOptions);
            dispatcher.setVolumeLogarithmic(volume / 100);

            dispatcher.on('speaking', (speaking) => { //when finished speaking, play next song because that means songs over
                if (pause == true) return;
                if (speaking == 1) return; //still speaking
                console.log('dispatcher end 2')
                if (repeat == false) {
                    console.log('no repeat so shift queue. 3');

                    queue.shift();
                }
                playMusic();
            });



        });
    }
}

//Standard functionality just to convert time in seconds to readable hours:min:seconds
function convertTime(sec) {
    var hours = Math.floor(sec / 3600);
    (hours >= 1) ? sec = sec - (hours * 3600) : hours = '00';
    var min = Math.floor(sec / 60);
    (min >= 1) ? sec = sec - (min * 60) : min = '00';
    (sec < 1) ? sec = '00' : void 0;

    (min.toString().length == 1) ? min = '0' + min : void 0;
    (sec.toString().length == 1) ? sec = '0' + sec : void 0;

    return hours + ':' + min + ':' + sec;
}

var activeChannelId;
var activeVoiceConnection;

function start(member) {

    if (!member || !member.voice.channel) {

        return;
    }
    member.voice.channel.join().then((voiceConnection) => {

        dispatcher = voiceConnection.play("./silence.mp3", {
            volume: '.001'
        });


        activeChannelId = member.voice.channelID;
        activeVoiceConnection = voiceConnection;



        voiceConnections.set(activeChannelId, activeVoiceConnection);
    }).catch(console.error);
}

function stop(member) {

    if (!member || !member.voice.channel) {
        return;
    }

    console.log("Stopping...");
    queue = [];
    if (dispatcher) {
        dispatcher.end();
    }
    if (musicStream) {
        musicStream.end();
    }
    client.voice.connections.forEach(connection => {
        connection.disconnect();
    });
    if (voiceReceivers.get(member.voice.channelID)) {
        voiceReceivers.get(member.voice.channelID).destroy();
        voiceReceivers.delete(member.voice.channelID);
        voiceConnections.get(member.voice.channelID).disconnect();
        voiceConnections.delete(member.voice.channelID);
    }

}


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
                        "commandPrefix" :  process.env.commandPrefix
                    }
                    resolve(true)
                }
                try {
                    config = JSON.parse(json);
                }catch(e){
                    config = {
                        
                        "discordToken": process.env.discordToken,
                        "discordDevID":  process.env.discordDevID,
                        "commandPrefix" :  process.env.commandPrefix
                    }
                }
                resolve(true)
            });
       
    });
}

/*
Initializes spotify API using given spotifyClient auth in config file. If nothing is given, the key functionality for the bot will still work
but any functionality related to spotify will not be enabled.
*/
async function initializeSpotifyAPI() {

    if (config.spotifyClientID && config.spotifyClientSecret) {
        try {
            spotifyApi = new SpotifyWebApi({
                clientId: config.spotifyClientID,
                clientSecret: config.spotifyClientSecret
            });
            return true;
        } catch (err) {
            console.log("Error connecting spotify API. Potentially incorrect spotifyClientID or spotifyClientSecret")
            return false;
        }
    } else {
        console.log("spotifyClientID or spotifyClientSecret missing. Will not be able to use spotify functionality.")
        return false;
    }
}

/*
Initial boot sequence to make sure that we properly load our config file first and boot in order to avoid crashes.
Sets up our config global and other necessary stuffs.
*/
async function bootSequence() {
    await reloadConfig();
    await initializeSpotifyAPI();
    await client.login(config.discordToken)//.catch(console.error);
    return true;
}

bootSequence().catch(err => console.error(err))