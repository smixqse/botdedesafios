exports.aliases = ["help", "ajuda"];
exports.description = "Comando de ajuda.";
exports.run = (Discord, bot, message, args) => {
    var fs = require("fs");
    let embed = new Discord.MessageEmbed()
                .setTitle("Comandos disponíveis")
                .setFooter(bot.user.username, bot.user.displayAvatarURL())
                //.setDescription("Use `" + bot.config.prefix + "help (nome do comando)` para ver mais informação sobre um comando. Exemplo: `" + bot.config.prefix + "help cor`.");
    fs.readdir("./commands/", (err, files) => {
        if (err) return console.error(err);
        files.forEach(file => {
            if (!file.endsWith(".js")) return;
            let props = require(`../commands/${file}`);
            let commandNames = props.aliases;
            if (["eval", "reload"].includes(commandNames[0])) return;
            embed.addField(bot.config.prefix + file.slice(0, -3), props.description + (!props.example ? "" : (" `" + bot.config.prefix + props.aliases[0] + " " + props.example + "`")), true);
        });
        message.channel.send(embed);
    })
}