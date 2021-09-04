const Discord = require('discord.js');

var client;

var analyticsChannelName = "raju-analytics";

const updateClient = (_client) => {
    client = _client;
}
module.exports["updateClient"] = updateClient

const getDecoratedText = (title,body) => {
    return new Discord.MessageEmbed()
            .setColor('#ff0066')
            .setTitle(title)
            .addField('MSG', body, true)
}
module.exports["getDecoratedText"] = getDecoratedText

const logToAnalytics = (tag,param) => {
    const channel = client.channels.cache.find(channel => channel.name === analyticsChannelName)
    channel.send(getDecoratedText(tag,param))
}

module.exports["logToAnalytics"] = logToAnalytics


const logDirectly = (body) => {
    const channel = client.channels.cache.find(channel => channel.name === analyticsChannelName)
    channel.send(body)
}

module.exports["logDirectly"] = logDirectly