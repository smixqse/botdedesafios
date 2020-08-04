exports.aliases = ["say"];
exports.description =
  "Usado para fazer o bot falar algo. (APENAS O CRIADOR DO BOT)";
exports.run = (bot, message, args) => {
  if (!bot.config.owners.some((a) => a == message.author)) return;
  try {
    if (message.mentions.channels.size < 1) {
      message.channel.send(args.join(" "));
    } else {
      message.mentions.channels.first().send(args.slice(1).join(" "));
    }
  } catch (e) {
    message.channel.send("Error: " + e.message);
  }
};
