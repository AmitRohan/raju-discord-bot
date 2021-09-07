const fs = require('fs');

const googleTTS = require('google-tts-api');
const myAnalytics = require('./analytics')


var counter = 0;
var handleVoiceStateChanges = (voiceChannel, dispatcher,  oldMember, newMember) => {
    if(!voiceChannel){
        return;
    }
    counter++;
    var userName = newMember.member.user.username;
    var str = "";

    if(userName.toLowerCase() == "raju")
      userName = "chad"

    if(userName.toLowerCase() == "razkro")
        userName = "The Meeting Guy"
    if(userName.toLowerCase() == "jay rangi")
        userName = "Big Daddy Jay"
    if(userName.toLowerCase() == "galaxo09")
        userName = "Navy Boy"
    if(userName.toLowerCase() == "aditya khoriwal")
        userName = "Sbse galat launda"
    if(userName.toLowerCase() == "rapmech")
        userName = "Cinifillia"
    if(userName.toLowerCase() == "moonlight")
        userName = "Mr Rohan"
    if(userName.toLowerCase() == "kirito" || userName.toLowerCase() == "kiritop")
        userName = "Hentai with senpai"


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
        convertToAudioAndReply(voiceChannel,dispatcher,str)
    }
}
module.exports["handleVoiceStateChanges"] = handleVoiceStateChanges


var convertToAudioAndReply = (voiceChannel, dispatcher,  stringToConvert) => {
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
                        dispatcher = connection.play("./voicedata/fileToPlay.mp3");
                    }).catch(err => console.log(err));
            }
        ) // base64 text
        .catch(console.error);
}
module.exports["convertToAudioAndReply"] = convertToAudioAndReply