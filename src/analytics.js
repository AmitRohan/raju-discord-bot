const Discord = require('discord.js');

var client;

var analyticsChannelName = "chad-analytics";

const updateClient = (_client) => {
    client = _client;
    channelCleanup();
}
module.exports["updateClient"] = updateClient

const channelCleanup = () => {
    const channel = client.channels.cache.find(channel => channel.name === analyticsChannelName)
    channel.bulkDelete(50)
}
module.exports["channelCleanup"] = channelCleanup


const getDecoratedText = (title,body) => {
    return new Discord.MessageEmbed()
            .setColor('#ff0066')
            .setTitle(body)
            .addField('Type', title, true)
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