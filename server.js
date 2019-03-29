/* global Set */
var Discord = require("discord.js");
var Enmap = require("enmap");
var fs = require("fs");
var bot = new Discord.Client({ presence: { status: "online", activity: { type: "WATCHING", name: "os vídeos do Core!" } } });
const presences = [["WATCHING", "os vídeos do Core!"], ["WATCHING", "as lives do Core no Facebook: fb.gg/Core"], ["LISTENING", "o Core falar \"Meu Deus do céu!\""], ["PLAYING", "com o SMixqse, meu criador!"], ["LISTENING", "os gritos do Core!"], ["WATCHING", "o Core pistolar!"]];
bot.commands = new Enmap();
bot.config = require("./config.json");
bot.colorRoles = new Enmap();
bot.utils = require("./utils");
global.rolemention = {roleID: false, author: false};

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
}, 277000);

bot.on("ready", ready => {
    bot.setInterval(() => {
    	let presence = presences[Math.floor(Math.random() * presences.length)];
    	bot.user.setActivity(presence[1], {type:presence[0]});
    }, 300000)
})

fs.readdir("./commands/", (err, files) => {
    console.log("[Info] Carregando comandos...");
    if (err) return console.error(err);
    bot.files = files;
    files.forEach(file => {
        if (!file.endsWith(".js")) return;
        let props = require(`./commands/${file}`);
        let commandNames = props.aliases;
        commandNames.forEach(commandName => { bot.commands.set(commandName, props); });
    });
    console.log("[Info] Comandos carregados!");
})

fs.readdir("./events/", (err, files) => {
    console.log("[Info] Carregando eventos...");
    if (err) return console.error(err);
    files.forEach(file => {
        if (!file.endsWith(".js")) return;
        const event = require(`./events/${file}`);
        let eventName = file.split(".")[0];
        bot.on(eventName, event.bind(null, Discord, bot));
        delete require.cache[require.resolve(`./events/${file}`)];
    })
    console.log("[Info] Eventos carregados!");
});

bot.login(process.env.TOKEN).then(() => { console.log("[Info] Logado com sucesso!"); }).catch(() => { console.log("[Info] O bot não pôde logar."); process.exit(); });
console.log("[Info] Logando...")