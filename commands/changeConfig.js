exports.aliases = ["changeconfig", "cs", "config"];
exports.description = "Altere uma configuração do bot (APENAS O CRIADOR)";
exports.run = async (bot, message, args) => {
  if (!bot.config.owners.includes(message.author.id)) return;
  const key = args[0];
  const value = args[1];

  const error = () => {
    message.channel.send("Essa configuração não existe.");
  };
  if (key.includes(".")) {
    var separateKey = key.split(".");
    if (!bot.config[key[0]]) {
      error();
      return;
    }
    bot.config[key[0]][key[1]] = value;
  } else {
    if (!bot.config[key[0]]) {
      error();
      return;
    }
    if (typeof bot.config[key] === "object") {
      bot.config[key][0] = value;
    } else {
      bot.config[key] = value;
    }
  }
  message.channel.send("Feito.");
  require("fs").writeFileSync("./config.json", JSON.stringify(bot.config));
};
