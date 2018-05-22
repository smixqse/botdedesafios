var Discord = require("discord.js");
var Enmap = require("enmap");
var fs = require("fs");
var bot = new Discord.Client({ presence: { activity: { type: "WATCHING", name: "o canal do Core!" } } });
bot.commands = new Enmap();
bot.config = require("./config.json");
var cooldown = new Set();
var slowmode = new Enmap();
bot.utils = require("./utils");

// Manter o bot ligado no Glitch
const http = require('http');
const express = require('express');
const app = express();
app.get("/", (request, response) => {
  console.log(Date.now() + " Ping Recebido");
  response.sendStatus(200);
});
app.listen(process.env.PORT);
setInterval(() => {
  http.get(`http://${process.env.PROJECT_DOMAIN}.glitch.me/`);
}, 280000);

fs.readdir("./commands/", (err, files) => {
    console.log("[Info] Carregando comandos...");
    if (err) return console.error(err);
    bot.files = files;
    files.forEach(file => {
        if (!file.endsWith(".js")) return;
        let props = require(`./commands/${file}`);
        let commandNames = props.aliases;
        commandNames.forEach(commandName => {bot.commands.set(commandName, props);});
    });
    console.log("[Info] Comandos carregados!");
})

bot.on("message", message => {
    if (message.author.bot) return;
    if (slowmode.has(message.channel.id)) {
      const time = slowmode.get(message.channel.id);
      const user = message.member;
      const role = bot.roles.get("448291438887698432");
      user.addRole(role)
      setTimeout(() => {
        user.removeRole(role);
        }, time);
    }
    if (message.guild.id != bot.config.guild) return;
    if (!message.content.split(" ")[0].startsWith(bot.config.prefix)) return;
    let command = message.content.split(" ")[0].slice(bot.config.prefix.length);
    let args = message.content.split(" ").slice(1);
    const cmd = bot.commands.get(command);
    if (!cmd) return;
    if (cooldown.has(message.author.id)) message.channel.send("<@" + message.author.id + "> Aguarde 3 segundos pra usar comandos novamente.");
    if (cooldown.has(message.author.id)) return;
    cooldown.add(message.author.id);
    setTimeout(() => {cooldown.delete(message.author.id);}, 3000);
    cmd.run(Discord, bot, message, args, slowmode);
})

bot.login(process.env.TOKEN).then(() => {console.log("[Info] Logado com sucesso!");}).catch(() => {console.log("[Info] O bot não pôde logar."); process.exit();});
console.log("[Info] Logando...")
