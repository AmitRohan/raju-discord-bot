const fs = require('fs');

const googleTTS = require('google-tts-api');
const myAnalytics = require('./analytics')

var client;

var announcerChannel = "Chad House";

const updateClient = (_client) => {
    client = _client;
    channelCleanup();
}
module.exports["updateClient"] = updateClient

const channelCleanup = () => {
    voiceChannel = client.channels.cache.find(channel => channel.name === announcerChannel)
}


var handleVoiceStateChanges = (oldMember, newMember) => {

    var userName = newMember.member.user.username;
    var str = "";

    var temp = {
        nameConfigs : [
            {
                name : "kiritop",
                toShow : "Hentai with senpai"
            },{
                name : "moonlight",
                toShow : "Mr Rohan"
            },{
                name : "rapmech",
                toShow : "Cinefillia"
            },{
                name : "aditya khoriwal",
                toShow : "Sbse galat launda"
            },{
                name : "galaxo09",
                toShow : "Navy Boy"
            },{
                name : "jay rangi",
                toShow : "Big Daddy Jay"
            },{
                name : "razkro",
                toShow : "The Meeting Guy"
            },{
                name : "raju",
                toShow : "chad"
            }
        ]
    }

    var userNamesToUse = temp.nameConfigs.filter(  nameConfig  => nameConfig.name.toLowerCase() == userName.toLowerCase())
    userName = userNamesToUse.length > 0 ? userNamesToUse[0].toShow : userName;
    


    if(newMember.channelID !== oldMember.channelID){
        // New Join
        str = userName + (newMember.channelID == undefined ? " bhag gaya sala" : " padhara hai");
    }else{
        if(newMember.mute !== oldMember.mute){
            if(newMember.mute){
                // if(userName.toLowerCase() == "jay rangi"){
                    str = userName +" ne muh may lay liya hai. Kripya nikaalne ka intezaar kare."
                // }else{
                //     str = userName +" ne muh may lay liya hai. Kripya nikaalne ka intezaar kare."
                // }
            }else{
                // if(userName.toLowerCase() == "jay rangi"){
                    str = userName + " ne muh may se nikaal liya, wapis lene ka intezaar kare"
                // }else{
                //      str = userName + " ne muh may se nikaal liya, wapis lene ka intezaar kare"
                // }
            }
        }

        if(newMember.streaming !== oldMember.streaming){
            if(newMember.streaming){
                str = userName + " apna sub ko dikhaa raha hai. Deekhne ka man ho to aa jaaiye.";

            }else{
                str = userName + " ne apna sub ko dikhana bund kr diya hai.";

            }
        }
    }

    if(str !== ""){
        myAnalytics.logToAnalytics("Info",str)
        convertToAudioAndReply(voiceChannel,str)
    }
}
module.exports["handleVoiceStateChanges"] = handleVoiceStateChanges


var convertToAudioAndReply = (voiceChannel,  stringToConvert) => {
    googleTTS
        .getAudioBase64(stringToConvert, {
            lang: 'hi',
            slow: false,
            host: 'https://translate.google.com',
            timeout: 10000,
        })
        .then(
            base64data => {
                fs.writeFileSync('voicedata/fileToPlay.mp3', Buffer.from(base64data.replace('data:audio/mp3; codecs=opus;base64,', ''), 'base64'));


                if(voiceChannel)
                    voiceChannel.join().then(connection =>{
                        connection.play("./voicedata/fileToPlay.mp3");
                    }).catch(err => console.log(err));
            }
        ) // base64 text
        .catch(console.error);
}
module.exports["convertToAudioAndReply"] = convertToAudioAndReply