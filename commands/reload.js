const fs = require("fs");
exports.aliases = ["reload", "recarregar", "cmdr", "resetcmd"];
exports.description =
  "Usado para recarregar arquivos de comandos ou eventos. APENAS PARA O CRIADOR";
exports.run = (bot, message, args) => {
  if (!bot.config.owners.includes(message.author.id)) return;
  if (!args || args.size < 1)
    message.channel.send(
      bot.utils.mention(message.author.id) +
        "Escreva um comando pra recarregar."
    );
  const commandName = args[1];
  let thereIsSomeError = false;
  var myRequire;
  try {
    if (args[0] === "command" || args[0] !== "event") {
      myRequire = `./${commandName}.js`;
      require(myRequire);
    } else if (args[0] === "event") {
      myRequire = `../events/${commandName}.js`;
      require(myRequire);
    }
  } catch (e) {
    thereIsSomeError = true;
  }
  if (thereIsSomeError)
    message.channel.send(
      bot.utils.mention(message.author.id) +
        "Esse comando ou evento não existe."
    );
  if (thereIsSomeError) return;
  delete require.cache[require.resolve(myRequire)];
  const props = require(myRequire);
  if (args[0] === "event") {
    bot.removeAllListeners(commandName);
    bot.on(commandName, props.bind(null, bot));
  }
  if (args[0] === "command")
    props.aliases.forEach((alias) => {
      bot.commands.delete(alias);
      bot.commands.set(alias, props);
    });
  message.channel.send(
    bot.utils.mention(message.author.id) +
      "O comando/evento `" +
      args[1] +
      "` foi recarregado."
  );
};
