const Discord = require("discord.js");
require("dotenv").config();
const Enmap = require("enmap");
const fs = require("fs");
const bot = new Discord.Client({
  presence: {
    status: "online",
    activity: { type: "WATCHING", name: "os vídeos do Core!" }
  }
});
const presences = [
  ["WATCHING", "os vídeos do Core!"],
  ["WATCHING", "as lives do Core!"],
  ["LISTENING", 'o Core falar "Meu Deus do céu!"'],
  ["PLAYING", "com o SMixqse, meu criador!"],
  ["LISTENING", "os gritos do Core ao jogar jogos eletrônicos!"],
  ["WATCHING", "o Core pistolar!"]
];
bot.commands = new Enmap();
bot.config = require("./config.json");
bot.imgsDb = new Enmap({
  name: "savedMedia",
  fetchAll: false,
  dataDir: "./db",
  pollingInterval: 3000
});
bot.utils = require("./utils");
global.rolemention = { roleID: false, author: false };

bot.on("ready", (ready) => {
  bot.setInterval(() => {
    let presence = presences[Math.floor(Math.random() * presences.length)];
    bot.user.setActivity(presence[1], { type: presence[0] });
  }, 300000);
});

fs.readdir("./commands/", (err, files) => {
  console.log("[Info] Carregando comandos...");
  if (err) return console.error(err);
  bot.files = files;
  files.forEach((file) => {
    if (!file.endsWith(".js")) return;
    let props = require(`./commands/${file}`);
    let commandNames = props.aliases;
    commandNames.forEach((commandName) => {
      bot.commands.set(commandName, props);
    });
  });
  console.log("[Info] Comandos carregados!");
});

fs.readdir("./events/", (err, files) => {
  console.log("[Info] Carregando eventos...");
  if (err) return console.error(err);
  files.forEach((file) => {
    if (!file.endsWith(".js")) return;
    const event = require(`./events/${file}`);
    let eventName = file.split(".")[0];
    bot.on(eventName, event.bind(null, bot));
    delete require.cache[require.resolve(`./events/${file}`)];
  });
  console.log("[Info] Eventos carregados!");
});

bot
  .login(process.env.TOKEN)
  .then(() => {
    console.log("[Info] Logado com sucesso!");
  })
  .catch(() => {
    console.log("[Info] O bot não pôde logar.");
    process.exit();
  });
console.log("[Info] Logando...");
