exports.aliases = ["ping"];
exports.description = "Verifique o ping do bot.";
exports.run = async (bot, message, args) => {
  const sentMsg = await message.channel.send("Pong!");
  sentMsg.edit(
    `Pong! \`${sentMsg.createdTimestamp - message.createdTimestamp}ms\``
  );
};
