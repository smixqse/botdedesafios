var fs = require("fs");
exports.aliases = ["reload", "recarregar", "cmdr", "resetcmd"];
exports.description = "Usado para recarregar arquivos de comandos.";
exports.run = (bot, message, args) => {
  if (!bot.config.owners.includes(message.author.id)) return;
  if (!args || args.size < 1)
    message.channel.send(
      bot.utils.mention(message.author.id) +
        "Escreva um comando pra recarregar."
    );
  const commandName = args[0];
  let thereIsSomeError = false;
  try {
    require(`./${commandName}.js`);
  } catch (e) {
    thereIsSomeError = true;
  }
  if (thereIsSomeError)
    message.channel.send(
      bot.utils.mention(message.author.id) +
        "Digite apenas nomes de arquivos de comandos, não as aliases."
    );
  if (thereIsSomeError) return;
  if (!bot.commands.has(commandName))
    message.channel.send(
      bot.utils.mention(message.author.id) + "Esse comando não existe."
    );
  if (!bot.commands.has(commandName)) return;
  delete require.cache[require.resolve(`./${commandName}.js`)];
  const props = require(`./${commandName}.js`);
  props.aliases.forEach((alias) => {
    bot.commands.delete(alias);
    bot.commands.set(alias, props);
  });
  message.channel.send(
    bot.utils.mention(message.author.id) +
      "O comando `" +
      args[0] +
      "` foi recarregado."
  );
};
