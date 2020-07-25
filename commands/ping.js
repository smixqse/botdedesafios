exports.aliases = ["ping"];
exports.description = "Verifique o ping do bot.";
exports.run = async (Discord, bot, message, args) => {
    const sentMsg = await message.channel.send("Pong!");
    sentMsg.edit(`Pong! \`${sentMsg.createdTimestamp - message.createdTimestamp}ms\``)
};