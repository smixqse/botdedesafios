var Enmap = require("enmap");
var cooldown = new Set();
var slowmode = new Enmap();
module.exports = (Discord, bot, message) => {
    if (message.author.bot) return;
    if (slowmode.has(message.channel.id)) {
       var user = message.member;
       var role = bot.roles.find("448291438887698432");
       var time = slowmode.get(message.channel.id);
       user.addRole(role);
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
    setTimeout(() => { cooldown.delete(message.author.id); }, 3000);
    cmd.run(Discord, bot, message, args, slowmode);
}
